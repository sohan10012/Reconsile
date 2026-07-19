// Strict schema-validation stage.
//
// This is the FIRST deterministic gate in the zero-hallucination methodology.
// The LLM produces a probabilistic extraction; before any downstream stage is
// allowed to trust those values, this module validates them deterministically:
//   - required fields are present
//   - data types are correct (numbers are finite numbers, dates parse, etc.)
//   - values are within sane ranges (no negative totals, no absurd quantities)
//   - internal structure is well-formed (line items have the right shape)
//
// It runs entirely outside the LLM and emits RuleCheck entries so every
// finding is auditable and surfaced in the validation report.

import type { ExtractedInvoice, RuleCheck, SchemaValidationResult } from "@/lib/types"

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v)

// A permissive ISO-ish date check: YYYY-MM-DD or anything Date can parse.
function isValidDate(v: string | null): boolean {
  if (!v) return false
  const t = Date.parse(v)
  return !Number.isNaN(t)
}

export function validateInvoiceSchema(
  invoice: ExtractedInvoice,
): SchemaValidationResult {
  const checks: RuleCheck[] = []

  const push = (c: Omit<RuleCheck, "category">) =>
    checks.push({ ...c, category: "schema" })

  // --- Required fields -------------------------------------------------------
  push({
    id: "schema_invoice_number",
    label: "Invoice number is a non-empty string",
    severity: "critical",
    weight: 1,
    passed: typeof invoice.invoiceNumber === "string" && invoice.invoiceNumber.trim().length > 0,
    detail:
      invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0
        ? `Parsed "${invoice.invoiceNumber}".`
        : "Missing or empty invoice number in the model output.",
    actual: invoice.invoiceNumber,
  })

  push({
    id: "schema_vendor_name",
    label: "Vendor name is present",
    severity: "critical",
    weight: 1,
    passed: typeof invoice.vendorName === "string" && invoice.vendorName.trim().length > 0,
    detail:
      invoice.vendorName && invoice.vendorName.trim().length > 0
        ? `Parsed "${invoice.vendorName}".`
        : "Missing or empty vendor name in the model output.",
    actual: invoice.vendorName,
  })

  // --- Type & range: monetary fields ----------------------------------------
  push({
    id: "schema_total_type",
    label: "Total amount is a positive number",
    severity: "critical",
    weight: 1,
    passed: isFiniteNumber(invoice.totalAmount) && invoice.totalAmount > 0,
    detail:
      isFiniteNumber(invoice.totalAmount) && invoice.totalAmount > 0
        ? `Parsed ${invoice.totalAmount}.`
        : isFiniteNumber(invoice.totalAmount)
          ? `Total is ${invoice.totalAmount}, which is not greater than zero.`
          : "Total amount is missing or not a valid number.",
    actual: invoice.totalAmount,
  })

  push({
    id: "schema_subtotal_type",
    label: "Subtotal is a non-negative number when present",
    severity: "warning",
    weight: 1,
    passed: invoice.subtotal == null || (isFiniteNumber(invoice.subtotal) && invoice.subtotal >= 0),
    detail:
      invoice.subtotal == null
        ? "No subtotal provided (allowed)."
        : isFiniteNumber(invoice.subtotal) && invoice.subtotal >= 0
          ? `Parsed ${invoice.subtotal}.`
          : "Subtotal is present but not a valid non-negative number.",
    actual: invoice.subtotal,
  })

  push({
    id: "schema_tax_type",
    label: "Tax is a non-negative number when present",
    severity: "warning",
    weight: 1,
    passed: invoice.tax == null || (isFiniteNumber(invoice.tax) && invoice.tax >= 0),
    detail:
      invoice.tax == null
        ? "No tax provided (allowed)."
        : isFiniteNumber(invoice.tax) && invoice.tax >= 0
          ? `Parsed ${invoice.tax}.`
          : "Tax is present but not a valid non-negative number.",
    actual: invoice.tax,
  })

  // --- Date validity ---------------------------------------------------------
  push({
    id: "schema_invoice_date",
    label: "Invoice date is a parseable date",
    severity: "warning",
    weight: 1,
    passed: isValidDate(invoice.invoiceDate),
    detail: isValidDate(invoice.invoiceDate)
      ? `Parsed "${invoice.invoiceDate}".`
      : "Invoice date is missing or not a recognizable date.",
    actual: invoice.invoiceDate,
  })

  // --- Currency --------------------------------------------------------------
  push({
    id: "schema_currency",
    label: "Currency is a 3-letter code when present",
    severity: "warning",
    weight: 1,
    passed: invoice.currency == null || /^[A-Za-z]{3}$/.test(invoice.currency.trim()),
    detail:
      invoice.currency == null
        ? "No currency provided (allowed)."
        : /^[A-Za-z]{3}$/.test(invoice.currency.trim())
          ? `Parsed "${invoice.currency}".`
          : `Currency "${invoice.currency}" is not a valid 3-letter code.`,
    actual: invoice.currency,
  })

  // --- Line-item structural integrity ---------------------------------------
  const malformedLines = invoice.lineItems.filter(
    (li) =>
      typeof li.description !== "string" ||
      li.description.trim().length === 0 ||
      !isFiniteNumber(li.quantity) ||
      li.quantity <= 0 ||
      !isFiniteNumber(li.unitPrice) ||
      li.unitPrice < 0 ||
      !isFiniteNumber(li.lineTotal) ||
      li.lineTotal < 0,
  ).length

  push({
    id: "schema_line_items",
    label: "Line items are well-formed",
    severity: invoice.lineItems.length === 0 ? "warning" : "critical",
    weight: 1,
    passed: invoice.lineItems.length > 0 && malformedLines === 0,
    detail:
      invoice.lineItems.length === 0
        ? "No line items were extracted."
        : malformedLines === 0
          ? `All ${invoice.lineItems.length} line item(s) are structurally valid.`
          : `${malformedLines} of ${invoice.lineItems.length} line item(s) are malformed.`,
    actual: malformedLines,
  })

  const criticalFailed = checks.some((c) => c.severity === "critical" && !c.passed)
  const issues = checks.filter((c) => !c.passed).map((c) => c.detail)

  return { valid: !criticalFailed, checks, issues }
}
