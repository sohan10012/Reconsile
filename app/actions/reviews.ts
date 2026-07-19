'use server'

import { createClient } from "@/lib/supabase/server"
import { getUserId } from "@/lib/session"
import { validateReviewInput } from "@/lib/validation/input"
import { revalidatePath } from "next/cache"

export async function submitReview(
  invoiceId: number,
  action: 'approve' | 'reject' | 'comment',
  comment?: string,
) {
  const userId = await getUserId()

  // Input validation
  const validation = validateReviewInput({ invoiceId, action, comment })
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message)
  }
  const cleanData = validation.data

  const supabase = await createClient()

  // 1. Ownership check on the invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('id, status, decision')
    .eq('id', cleanData.invoiceId)
    .eq('user_id', userId)
    .single()

  if (invError || !invoice) throw new Error("Invoice not found or unauthorized")

  // 2. Insert the invoice review entry
  const { error: reviewError } = await supabase
    .from('invoice_reviews')
    .insert({
      user_id: userId,
      invoice_id: cleanData.invoiceId,
      action: cleanData.action,
      comment: cleanData.comment || null,
    })

  if (reviewError) throw new Error(reviewError.message)

  // 3. Update the invoice status / decision if review resolves it
  if (cleanData.action === 'approve' || cleanData.action === 'reject') {
    const nextDecision = cleanData.action === 'approve' ? 'approve' : 'reject'

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        decision: nextDecision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanData.invoiceId)
      .eq('user_id', userId)

    if (updateError) throw new Error(updateError.message)

    // Log this decision to audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      invoice_id: cleanData.invoiceId,
      step: 'decision',
      status: 'success',
      message: `Human reviewer marked invoice as ${cleanData.action.toUpperCase()}${cleanData.comment ? `: "${cleanData.comment}"` : ''}.`,
    })
  } else {
    // It's a comment only. Add an audit log entry for it.
    await supabase.from('audit_logs').insert({
      user_id: userId,
      invoice_id: cleanData.invoiceId,
      step: 'decision',
      status: 'success',
      message: `Human reviewer added a comment: "${cleanData.comment}"`,
    })
  }

  revalidatePath(`/invoices/${cleanData.invoiceId}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
}

export async function getReviews(invoiceId: number) {
  if (!invoiceId || typeof invoiceId !== 'number') throw new Error('Invalid Invoice ID')

  const userId = await getUserId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_reviews')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
