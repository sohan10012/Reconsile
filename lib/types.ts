// Shared domain types for the P2P alignment engine.

export type PipelineStep =
  | "upload"
  | "ocr"
  | "extraction"
  | "schema"
  | "matching"
  | "rules"
  | "decision"

export type PipelineStatus = "started" | "success" | "failed"

export type InvoiceStatus =
  | "uploaded"
  | "processing"
  | "extracted"
  | "matched"
  | "validated"
  | "failed"

export type Decision = "approve" | "review" | "reject"

// Structured extraction produced by OCR + LLM.
export interface ExtractedLineItem {
  description: string
  sku?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface ExtractedInvoice {
  invoiceNumber: string | null
  vendorName: string | null
  invoiceDate: string | null
  poNumber: string | null
  currency: string | null
  subtotal: number | null
  tax: number | null
  totalAmount: number | null
  lineItems: ExtractedLineItem[]
}

// Result of the fuzzy matching stage.
export interface VendorMatchResult {
  vendorId: number | null
  vendorName: string | null
  confidence: number
  candidates: Array<{ id: number; name: string; score: number }>
}

export interface PoMatchResult {
  poId: number | null
  poNumber: string | null
  confidence: number
  method: "exact" | "fuzzy" | "reranked" | "none"
  candidates: Array<{ id: number; poNumber: string; score: number }>
}

export interface LineItemMatch {
  invoiceItemIndex: number
  poItemId: number | null
  score: number
}

// A single deterministic rule outcome.
export interface RuleCheck {
  id: string
  label: string
  severity: "critical" | "warning" | "info"
  passed: boolean
  weight: number
  detail: string
  category?: "schema" | "business"
  expected?: string | number | null
  actual?: string | number | null
}

// Result of the strict schema-validation stage. This runs on the raw LLM
// output BEFORE any value is trusted — it is the first deterministic gate.
export interface SchemaValidationResult {
  valid: boolean
  checks: RuleCheck[]
  issues: string[]
}

export interface ValidationResult {
  decision: Decision
  score: number
  checks: RuleCheck[]
}
