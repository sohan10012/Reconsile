// Duplicate detection service.
//
// Performs deterministic checks to find duplicate invoice documents.
// Detects exact duplicates, invoice number reuse, and fuzzy duplicates
// (e.g. same vendor + same total amount + close dates).

import { createClient } from "@/lib/supabase/server"

export interface DuplicateCheckInput {
  userId: string
  currentInvoiceId: number
  invoiceNumber: string | null
  vendorName: string | null
  totalAmount: number | null
  invoiceDate: string | null // Raw extracted date
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean
  reason: string | null
  matchingInvoiceId: number | null
}

/**
 * Checks for duplicate invoices in the database.
 */
export async function detectDuplicateInvoice(
  input: DuplicateCheckInput,
): Promise<DuplicateDetectionResult> {
  const { userId, currentInvoiceId, invoiceNumber, vendorName, totalAmount, invoiceDate } = input
  const supabase = await createClient()

  // 1. Exact Invoice Number match (strongest signal)
  if (invoiceNumber) {
    const { data: numMatches, error } = await supabase
      .from('invoices')
      .select('id, file_name')
      .eq('user_id', userId)
      .eq('invoice_number', invoiceNumber)
      .neq('id', currentInvoiceId)
      .not('status', 'eq', 'failed') as any // bypass workspace ts typings issues

    if (!error && numMatches && numMatches.length > 0) {
      return {
        isDuplicate: true,
        reason: `Invoice number "${invoiceNumber}" was already used by invoice #${numMatches[0].id} (${numMatches[0].file_name}).`,
        matchingInvoiceId: numMatches[0].id,
      }
    }
  }

  // 2. Fuzzy match: Same vendor + Same total amount + similar date window
  if (vendorName && totalAmount && totalAmount > 0) {
    // Query invoices with the same total amount and similar vendor
    const { data: potentialMatches, error } = await supabase
      .from('invoices')
      .select('id, file_name, vendor_name, total_amount, created_at')
      .eq('user_id', userId)
      .eq('total_amount', totalAmount)
      .neq('id', currentInvoiceId)
      .not('status', 'eq', 'failed') as any // bypass workspace ts typings issues

    if (!error && potentialMatches && potentialMatches.length > 0) {
      // Perform fuzzy checks on vendor name and date proximity
      const currentParsedDate = invoiceDate ? new Date(invoiceDate) : null

      for (const inv of potentialMatches) {
        // Vendor name match (simple substring / similarity check)
        const v1 = (vendorName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const v2 = (inv.vendor_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

        const vendorMatch = v1.includes(v2) || v2.includes(v1) || v1 === v2

        if (vendorMatch) {
          // If we have an extracted date, check if it's within a 30-day window
          let dateProximate = false
          if (currentParsedDate && !isNaN(currentParsedDate.getTime())) {
            const dbDate = new Date(inv.created_at)
            const diffDays = Math.abs(currentParsedDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60 * 24)
            if (diffDays <= 30) {
              dateProximate = true
            }
          } else {
            // Default: if no invoice date, match within 30 days of upload timestamp
            const dbDate = new Date(inv.created_at)
            const diffDays = Math.abs(Date.now() - dbDate.getTime()) / (1000 * 60 * 60 * 24)
            if (diffDays <= 30) {
              dateProximate = true
            }
          }

          if (dateProximate) {
            return {
              isDuplicate: true,
              reason: `Fuzzy duplicate detected: Invoice #${inv.id} (${inv.file_name}) shares the same vendor ("${inv.vendor_name}") and total amount ($${totalAmount}) within a 30-day window.`,
              matchingInvoiceId: inv.id,
            }
          }
        }
      }
    }
  }

  return {
    isDuplicate: false,
    reason: null,
    matchingInvoiceId: null,
  }
}
