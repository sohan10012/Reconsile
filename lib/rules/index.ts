// Deterministic rule engine.
//
// This is the heart of the "deterministic-first" philosophy: every decision
// is produced by explicit, auditable rules — not by an opaque model. Each
// rule returns a RuleCheck with a weight; the weighted pass ratio produces a
// score, and the score plus any critical failures produces the final
// decision (approve / review / reject).

import type {
  Decision,
  ExtractedInvoice,
  RuleCheck,
  ValidationResult,
} from "@/lib/types"

export interface MatchedPoData {
  poNumber: string
  vendorName: string
  status: string
  currency: string
  subtotal: number
  tax: number
  totalAmount: number
  items: Array<{
    id: number
    description: string
    sku?: string | null
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
}

export interface RuleContext {
  invoice: ExtractedInvoice
  matchedPo: MatchedPoData | null
  poMatchConfidence: number
  vendorMatchConfidence: number
  duplicateInvoiceNumber: boolean
  // Schema-validation checks produced by the strict schema gate. They are
  // folded into the final report so a schema failure alone can block approval.
  schemaChecks?: RuleCheck[]
  // Tolerances
  amountTolerancePct?: number // default 2%
  priceTolerancePct?: number // default 5%
  autoApproveThreshold?: number // default 95%
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function runRules(ctx: RuleContext): ValidationResult {
  const {
    invoice,
    matchedPo,
    poMatchConfidence,
    vendorMatchConfidence,
    duplicateInvoiceNumber,
  } = ctx
  const amountTol = ctx.amountTolerancePct ?? 0.02
  const priceTol = ctx.priceTolerancePct ?? 0.05
  const autoApproveThreshold = ctx.autoApproveThreshold ?? 0.95

  // Schema checks (from the strict schema gate) lead the report so the
  // deterministic decision accounts for extraction integrity first.
  const checks: RuleCheck[] = [...(ctx.schemaChecks ?? [])]

  // --- Structural / presence checks ----------------------------------------
  checks.push({
    id: "has_invoice_number",
    label: "Invoice number present",
    severity: "critical",
    weight: 1,
    passed: !!invoice.invoiceNumber,
    detail: invoice.invoiceNumber
      ? `Invoice #${invoice.invoiceNumber}`
      : "No invoice number could be extracted.",
    actual: invoice.invoiceNumber,
  })

  checks.push({
    id: "not_duplicate",
    label: "Not a duplicate submission",
    severity: "critical",
    weight: 1,
    passed: !duplicateInvoiceNumber,
    detail: duplicateInvoiceNumber
      ? "An invoice with this number already exists for this account."
      : "No prior invoice with this number.",
  })

  checks.push({
    id: "has_total",
    label: "Total amount present",
    severity: "critical",
    weight: 1,
    passed: invoice.totalAmount != null && invoice.totalAmount > 0,
    detail:
      invoice.totalAmount != null
        ? `Total: ${invoice.totalAmount}`
        : "No total amount extracted.",
    actual: invoice.totalAmount,
  })

  // --- PO linkage ----------------------------------------------------------
  checks.push({
    id: "po_matched",
    label: "Matched to a purchase order",
    severity: "critical",
    weight: 1.5,
    passed: !!matchedPo,
    detail: matchedPo
      ? `Matched PO ${matchedPo.poNumber} (confidence ${(poMatchConfidence * 100).toFixed(0)}%)`
      : "No purchase order matched this invoice.",
    actual: matchedPo?.poNumber ?? null,
  })

  checks.push({
    id: "vendor_matched",
    label: "Vendor resolved",
    severity: "warning",
    weight: 1,
    passed: vendorMatchConfidence >= 0.55,
    detail: `Vendor match confidence ${(vendorMatchConfidence * 100).toFixed(0)}%.`,
    actual: `${(vendorMatchConfidence * 100).toFixed(0)}%`,
  })

  if (matchedPo) {
    // --- PO status -----------------------------------------------------------
    checks.push({
      id: "po_open",
      label: "Purchase order is open",
      severity: "warning",
      weight: 1,
      passed: matchedPo.status === "open",
      detail: `PO status is "${matchedPo.status}".`,
      expected: "open",
      actual: matchedPo.status,
    })

    // --- Currency ------------------------------------------------------------
    if (invoice.currency && matchedPo.currency) {
      checks.push({
        id: "currency_match",
        label: "Currency matches PO",
        severity: "critical",
        weight: 1,
        passed: invoice.currency.toUpperCase() === matchedPo.currency.toUpperCase(),
        detail: `Invoice ${invoice.currency} vs PO ${matchedPo.currency}.`,
        expected: matchedPo.currency,
        actual: invoice.currency,
      })
    }

    // --- Total within tolerance ---------------------------------------------
    if (invoice.totalAmount != null) {
      const diff = Math.abs(invoice.totalAmount - matchedPo.totalAmount)
      const allowed = matchedPo.totalAmount * amountTol
      checks.push({
        id: "total_within_tolerance",
        label: `Total within ${(amountTol * 100).toFixed(0)}% of PO`,
        severity: "critical",
        weight: 2,
        passed: diff <= allowed,
        detail: `Invoice ${round2(invoice.totalAmount)} vs PO ${round2(
          matchedPo.totalAmount,
        )} (diff ${round2(diff)}, allowed ${round2(allowed)}).`,
        expected: round2(matchedPo.totalAmount),
        actual: round2(invoice.totalAmount),
      })
    }

    // --- Arithmetic integrity (subtotal + tax = total) ----------------------
    if (
      invoice.subtotal != null &&
      invoice.tax != null &&
      invoice.totalAmount != null
    ) {
      const computed = round2(invoice.subtotal + invoice.tax)
      const diff = Math.abs(computed - invoice.totalAmount)
      checks.push({
        id: "arithmetic_integrity",
        label: "Subtotal + tax equals total",
        severity: "warning",
        weight: 1,
        passed: diff <= 0.02,
        detail: `Subtotal ${round2(invoice.subtotal)} + tax ${round2(
          invoice.tax,
        )} = ${computed}, total is ${round2(invoice.totalAmount)}.`,
        expected: round2(invoice.totalAmount),
        actual: computed,
      })
    }

    // --- Line item price checks ---------------------------------------------
    if (invoice.lineItems.length > 0 && matchedPo.items.length > 0) {
      let overpricedLines = 0
      for (const inv of invoice.lineItems) {
        // Find closest PO item by SKU or description keyword overlap.
        const po = matchedPo.items.find(
          (p) =>
            (inv.sku && p.sku && inv.sku.toLowerCase() === p.sku.toLowerCase()) ||
            p.description.toLowerCase().includes(inv.description.toLowerCase().slice(0, 8)),
        )
        if (po && po.unitPrice > 0) {
          const over = inv.unitPrice - po.unitPrice
          if (over > po.unitPrice * priceTol) overpricedLines++
        }
      }
      checks.push({
        id: "line_prices_within_tolerance",
        label: `Line unit prices within ${(priceTol * 100).toFixed(0)}%`,
        severity: "warning",
        weight: 1,
        passed: overpricedLines === 0,
        detail:
          overpricedLines === 0
            ? "All matched line prices are within tolerance."
            : `${overpricedLines} line(s) exceed the unit price tolerance.`,
        actual: overpricedLines,
      })

      // --- Quantity over-billing ---------------------------------------------
      let overQtyLines = 0
      for (const inv of invoice.lineItems) {
        const po = matchedPo.items.find(
          (p) =>
            (inv.sku && p.sku && inv.sku.toLowerCase() === p.sku.toLowerCase()) ||
            p.description.toLowerCase().includes(inv.description.toLowerCase().slice(0, 8)),
        )
        if (po && inv.quantity > po.quantity) overQtyLines++
      }
      checks.push({
        id: "quantities_within_po",
        label: "Billed quantities do not exceed PO",
        severity: "warning",
        weight: 1,
        passed: overQtyLines === 0,
        detail:
          overQtyLines === 0
            ? "No line exceeds its ordered quantity."
            : `${overQtyLines} line(s) bill more than was ordered.`,
        actual: overQtyLines,
      })
    }
  }

  for (const c of checks) {
    if (!c.category) c.category = "business"
  }

  return finalize(checks, autoApproveThreshold)
}

// Convert weighted checks into a score and a decision.
export function finalize(checks: RuleCheck[], autoApproveThreshold = 0.95): ValidationResult {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const passedWeight = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0)
  const score = totalWeight === 0 ? 0 : Number((passedWeight / totalWeight).toFixed(4))

  const criticalFailed = checks.some((c) => c.severity === "critical" && !c.passed)
  const warningFailures = checks.filter((c) => c.severity === "warning" && !c.passed).length

  let decision: Decision
  if (criticalFailed) {
    decision = "reject"
  } else if (warningFailures > 0 || score < autoApproveThreshold) {
    decision = "review"
  } else {
    decision = "approve"
  }

  return { decision, score, checks }
}
