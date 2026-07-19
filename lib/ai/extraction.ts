// AI extraction service.
//
// Swappable interface: OCR + LLM structured extraction of an invoice document.
// Backed by the Vercel AI Gateway (vision model). The provider details are
// hidden behind `extractInvoice()` so the pipeline never depends on a
// specific model or SDK shape.

import { generateText, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import type { ExtractedInvoice } from "@/lib/types"

// Vision + file-input capable model.
// Gemini 2.0 Flash: fast, multimodal, cost-effective.
const MODEL = google("gemini-2.0-flash")

const lineItemSchema = z.object({
  description: z.string().describe("The product or service description."),
  sku: z.string().nullable().describe("SKU / item code if present, else null."),
  quantity: z.number().describe("Quantity billed."),
  unitPrice: z.number().describe("Price per unit."),
  lineTotal: z.number().describe("Total for this line (quantity * unitPrice)."),
})

const invoiceSchema = z.object({
  invoiceNumber: z.string().nullable().describe("The invoice number/id."),
  vendorName: z.string().nullable().describe("The vendor / supplier company name."),
  invoiceDate: z.string().nullable().describe("Invoice date as printed (ISO if possible)."),
  poNumber: z
    .string()
    .nullable()
    .describe("The purchase order number referenced on the invoice, if any."),
  currency: z.string().nullable().describe("ISO currency code, e.g. USD, EUR."),
  subtotal: z.number().nullable().describe("Subtotal before tax."),
  tax: z.number().nullable().describe("Total tax amount."),
  totalAmount: z.number().nullable().describe("Grand total amount due."),
  lineItems: z.array(lineItemSchema).describe("All billed line items."),
})

export interface ExtractionInput {
  data: Uint8Array
  fileType?: string | null
  fileName: string
}

export interface ExtractionOutput {
  ocrText: string
  extracted: ExtractedInvoice
}

const SYSTEM_PROMPT = `You are an expert accounts-payable OCR and data-extraction engine.
You receive a scanned invoice (image or PDF). Perform two jobs:
1. Transcribe ALL legible text from the document faithfully (this is the OCR text).
2. Extract the structured invoice fields.
Be precise with numbers. If a field is not present, use null. Never invent values.`

function isImage(fileType?: string | null): boolean {
  if (!fileType) return false
  return fileType.startsWith("image/")
}

function isPdf(fileType?: string | null, fileName?: string): boolean {
  return fileType === "application/pdf" || (fileName?.toLowerCase().endsWith(".pdf") ?? false)
}

// The single entry point used by the pipeline.
export async function extractInvoice(input: ExtractionInput): Promise<ExtractionOutput> {
  const { data, fileType, fileName } = input

  // Build the multimodal content for the file. We pass raw bytes (not a URL)
  // because invoices live in a private Blob store that the model cannot fetch.
  const filePart = isPdf(fileType, fileName)
    ? {
        type: "file" as const,
        mediaType: "application/pdf",
        data,
      }
    : {
        type: "file" as const,
        mediaType: isImage(fileType) ? fileType! : "image/png",
        data,
      }

  // 1) OCR pass — plain text transcription.
  const ocrResult = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe all text visible in this invoice document. Output plain text only.',
          },
          filePart,
        ],
      },
    ],
  })
  const ocrText = ocrResult.text.trim()

  // 2) Structured extraction pass.
  const structured = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    output: Output.object({ schema: invoiceSchema }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the structured invoice data. Here is the OCR text for reference:\n\n${ocrText}`,
          },
          filePart,
        ],
      },
    ],
  })

  const extracted = structured.output as ExtractedInvoice

  return { ocrText, extracted }
}
