// Pipeline orchestrator.
//
// Runs an uploaded invoice through the full deterministic-first pipeline:
//   upload -> ocr -> extraction -> matching -> rules -> decision
// Every step writes an immutable audit-log row (started/success/failed) with
// timing and payload, so the whole run is fully explainable after the fact.

import { createClient } from '@/lib/supabase/server'
import { extractInvoice } from '@/lib/ai/extraction'
import { validateInvoiceSchema } from '@/lib/validation/schema'
import {
  matchLineItems,
  matchPurchaseOrder,
  matchVendor,
} from '@/lib/matching'
import { crossEncoderRerank } from '@/lib/matching/reranker'
import { runRules, type MatchedPoData } from '@/lib/rules'
import { detectDuplicateInvoice } from './duplicate-detection'
import type { ExtractedInvoice, PipelineStep } from '@/lib/types'

interface StepLogger {
  log: (
    step: PipelineStep,
    status: 'started' | 'success' | 'failed',
    message: string,
    data?: unknown,
    durationMs?: number,
  ) => Promise<void>
}

function makeLogger(userId: string, invoiceId: number): StepLogger {
  return {
    async log(step, status, message, data, durationMs) {
      const supabase = await createClient()
      await supabase.from('audit_logs').insert({
        user_id: userId,
        invoice_id: invoiceId,
        step,
        status,
        message,
        data: data ? (data as any) : null,
        duration_ms: durationMs ?? null,
      })
    },
  }
}

// Read the uploaded invoice bytes from Supabase Storage.
async function readInvoiceBytes(
  userId: string,
  pathname: string | null,
  fileUrl: string,
): Promise<Uint8Array> {
  if (pathname) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('invoices')
      .download(pathname)

    if (!error && data) {
      const buf = await data.arrayBuffer()
      return new Uint8Array(buf)
    }
  }
  // Fallback: direct URL fetch (for legacy records)
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`Unable to read invoice file (${res.status}).`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function runPipeline(userId: string, invoiceId: number): Promise<void> {
  const logger = makeLogger(userId, invoiceId)
  const supabase = await createClient()

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .single()

  if (invErr || !invoice) throw new Error('Invoice not found')

  // Load user settings or default to values
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const amountTolerancePct = userSettings ? Number(userSettings.amount_tolerance_pct) : 0.02
  const priceTolerancePct = userSettings ? Number(userSettings.price_tolerance_pct) : 0.05
  const autoApproveThreshold = userSettings ? Number(userSettings.auto_approve_threshold) : 0.95

  try {
    await supabase
      .from('invoices')
      .update({ status: 'processing', error_message: null })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    // --- Step 1 & 2: OCR + extraction --------------------------------------
    const tExtract = Date.now()
    await logger.log('ocr', 'started', 'Running OCR + LLM extraction on the document.')
    const fileData = await readInvoiceBytes(userId, invoice.file_pathname, invoice.file_url)
    const { ocrText, extracted } = await extractInvoice({
      data: fileData,
      fileType: invoice.file_type,
      fileName: invoice.file_name,
    })
    const extractMs = Date.now() - tExtract
    await logger.log('ocr', 'success', 'Document transcribed.', { chars: ocrText.length }, extractMs)
    await logger.log(
      'extraction',
      'success',
      `Extracted invoice ${extracted.invoiceNumber ?? '(no number)'}.`,
      extracted,
      extractMs,
    )

    // Persist extraction.
    await supabase
      .from('invoices')
      .update({
        status: 'extracted',
        ocr_text: ocrText,
        extracted: extracted as any,
        invoice_number: extracted.invoiceNumber,
        vendor_name: extracted.vendorName,
        invoice_date: extracted.invoiceDate,
        po_number_raw: extracted.poNumber,
        currency: extracted.currency,
        subtotal: extracted.subtotal,
        tax: extracted.tax,
        total_amount: extracted.totalAmount,
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    // Replace invoice line items.
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('user_id', userId)

    if (extracted.lineItems.length > 0) {
      await supabase.from('invoice_items').insert(
        extracted.lineItems.map((li) => ({
          user_id: userId,
          invoice_id: invoiceId,
          description: li.description,
          sku: li.sku ?? null,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          line_total: li.lineTotal,
        })),
      )
    }

    // --- Step 3: Strict schema validation ----------------------------------
    // The first deterministic gate: validate the LLM output before trusting
    // any value downstream. Runs entirely outside the model.
    const tSchema = Date.now()
    await logger.log('schema', 'started', 'Validating extracted fields against the strict schema.')
    const schema = validateInvoiceSchema(extracted as ExtractedInvoice)
    const schemaMs = Date.now() - tSchema
    await logger.log(
      'schema',
      schema.valid ? 'success' : 'failed',
      schema.valid
        ? `Schema valid — ${schema.checks.length} field checks passed.`
        : `Schema validation caught ${schema.issues.length} issue(s): ${schema.issues.slice(0, 3).join('; ')}`,
      schema,
      schemaMs,
    )

    // --- Step 4: Matching --------------------------------------------------
    const tMatch = Date.now()
    await logger.log('matching', 'started', 'Resolving vendor and purchase order.')

    const { data: vendorRows } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', userId)

    const vendorMatch = matchVendor(
      extracted.vendorName,
      (vendorRows ?? []).map((v: any) => ({ id: v.id, name: v.name })),
    )

    const { data: poRows } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('user_id', userId)

    const poCandidates = (poRows ?? []).map((p: any) => ({
      id: p.id,
      poNumber: p.po_number,
      vendorName: p.vendor_name,
      totalAmount: Number(p.total_amount),
    }))

    let poMatch = matchPurchaseOrder(
      extracted.poNumber,
      extracted.vendorName,
      extracted.totalAmount,
      poCandidates,
    )

    // Cross-encoder re-rank the fuzzy candidates when there was no exact hit.
    if (poMatch.method !== 'exact' && poMatch.candidates.length > 1) {
      const query = `${extracted.poNumber ?? ''} ${extracted.vendorName ?? ''}`.trim()
      const reranked = crossEncoderRerank(
        query,
        poMatch.candidates.map((c: any) => {
          const row = (poRows ?? []).find((p: any) => p.id === c.id)!
          return {
            id: c.id,
            text: `${row.po_number} ${row.vendor_name}`,
            baseScore: c.score,
          }
        }),
      )
      const top = reranked[0]
      if (top && top.finalScore >= 0.6) {
        const row = (poRows ?? []).find((p: any) => p.id === top.id)!
        poMatch = {
          poId: top.id,
          poNumber: row.po_number,
          confidence: top.finalScore,
          method: 'reranked',
          candidates: reranked.map((r: any) => ({
            id: r.id,
            poNumber: (poRows ?? []).find((p: any) => p.id === r.id)!.po_number,
            score: r.finalScore,
          })),
        }
      }
    }

    const matchMs = Date.now() - tMatch
    await logger.log(
      'matching',
      'success',
      poMatch.poId
        ? `Matched PO ${poMatch.poNumber} via ${poMatch.method}.`
        : 'No purchase order matched.',
      { vendorMatch, poMatch },
      matchMs,
    )

    // Line-item alignment + persist match info.
    let matchedPoData: MatchedPoData | null = null
    if (poMatch.poId) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poMatch.poId)
        .eq('user_id', userId)
        .single()

      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', poMatch.poId)
        .eq('user_id', userId)

      if (po) {
        matchedPoData = {
          poNumber: po.po_number,
          vendorName: po.vendor_name,
          status: po.status,
          currency: po.currency,
          subtotal: Number(po.subtotal),
          tax: Number(po.tax),
          totalAmount: Number(po.total_amount),
          items: (poItems ?? []).map((it: any) => ({
            id: it.id,
            description: it.description,
            sku: it.sku,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
            lineTotal: Number(it.line_total),
          })),
        }

        // Align invoice items to PO items and store scores.
        const { data: invItemRows } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('user_id', userId)

        const lineMatches = matchLineItems(
          extracted.lineItems,
          (poItems ?? []).map((it: any) => ({ id: it.id, description: it.description, sku: it.sku })),
        )
        for (const lm of lineMatches) {
          const row = (invItemRows ?? [])[lm.invoiceItemIndex]
          if (row) {
            await supabase
              .from('invoice_items')
              .update({ matched_po_item_id: lm.poItemId, match_score: lm.score })
              .eq('id', row.id)
              .eq('user_id', userId)
          }
        }
      }
    }

    await supabase
      .from('invoices')
      .update({
        status: 'matched',
        matched_vendor_id: vendorMatch.vendorId,
        matched_po_id: poMatch.poId,
        match_confidence: poMatch.confidence,
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    // --- Step 5: Duplicate detection --------------------------------------
    const duplicateRes = await detectDuplicateInvoice({
      userId,
      currentInvoiceId: invoiceId,
      invoiceNumber: extracted.invoiceNumber,
      vendorName: extracted.vendorName,
      totalAmount: extracted.totalAmount,
      invoiceDate: extracted.invoiceDate,
    })
    const duplicate = duplicateRes.isDuplicate
    if (duplicate) {
      await logger.log('rules', 'started', `Duplicate check warning: ${duplicateRes.reason}`)
    }

    // --- Step 6: Deterministic rule engine --------------------------------
    const tRules = Date.now()
    await logger.log('rules', 'started', 'Evaluating deterministic rule set.')
    const result = runRules({
      invoice: extracted as ExtractedInvoice,
      matchedPo: matchedPoData,
      poMatchConfidence: poMatch.confidence,
      vendorMatchConfidence: vendorMatch.confidence,
      duplicateInvoiceNumber: duplicate,
      schemaChecks: schema.checks,
      amountTolerancePct,
      priceTolerancePct,
      autoApproveThreshold,
    })
    const rulesMs = Date.now() - tRules
    await logger.log(
      'rules',
      'success',
      `${result.checks.filter((c) => c.passed).length}/${result.checks.length} checks passed.`,
      result,
      rulesMs,
    )

    // Persist validation report.
    await supabase
      .from('validation_reports')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('user_id', userId)

    await supabase.from('validation_reports').insert({
      user_id: userId,
      invoice_id: invoiceId,
      decision: result.decision,
      score: result.score,
      checks: result.checks as any,
    })

    // --- Step 7: Decision --------------------------------------------------
    await supabase
      .from('invoices')
      .update({
        status: 'validated',
        decision: result.decision,
        validation_score: result.score,
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    await logger.log(
      'decision',
      'success',
      `Decision: ${result.decision.toUpperCase()} (score ${(result.score * 100).toFixed(0)}%).`,
      { decision: result.decision, score: result.score },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error'
    await logger.log('decision', 'failed', message)
    await supabase
      .from('invoices')
      .update({ status: 'failed', error_message: message })
      .eq('id', invoiceId)
      .eq('user_id', userId)
    throw err
  }
}
