'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/session'
import { runPipeline } from '@/lib/pipeline'
import { revalidatePath } from 'next/cache'

export async function getInvoices(opts?: {
  page?: number
  pageSize?: number
  status?: string
  decision?: string
  search?: string
}) {
  const userId = await getUserId()
  const supabase = await createClient()

  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }
  if (opts?.decision) {
    query = query.eq('decision', opts.decision)
  }
  if (opts?.search) {
    query = query.or(
      `file_name.ilike.%${opts.search}%,invoice_number.ilike.%${opts.search}%,vendor_name.ilike.%${opts.search}%`,
    )
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0, page, pageSize }
}

export async function getInvoice(id: number) {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (invError || !invoice) return null

  const [itemsResult, reportResult, logsResult, reviewsResult] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .eq('user_id', userId),
    supabase
      .from('validation_reports')
      .select('*')
      .eq('invoice_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('audit_logs')
      .select('*')
      .eq('invoice_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoice_reviews')
      .select('*')
      .eq('invoice_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])

  return {
    invoice,
    items: itemsResult.data ?? [],
    report: reportResult.data?.[0] ?? null,
    logs: logsResult.data ?? [],
    reviews: reviewsResult.data ?? [],
  }
}

// Create the invoice record after the file has been uploaded to storage.
export async function createInvoice(input: {
  fileName: string
  fileUrl: string
  filePathname?: string
  fileType?: string
}) {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_pathname: input.filePathname ?? null,
      file_type: input.fileType ?? null,
      status: 'uploaded',
    })
    .select()
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Failed to create invoice')

  await supabase.from('audit_logs').insert({
    user_id: userId,
    invoice_id: row.id,
    step: 'upload',
    status: 'success',
    message: `Uploaded ${input.fileName}.`,
  })

  revalidatePath('/invoices')
  return row
}

// Run (or re-run) the verification pipeline for an invoice.
export async function processInvoice(id: number) {
  const userId = await getUserId()
  const supabase = await createClient()

  // Ownership check
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!invoice) throw new Error('Invoice not found')

  await runPipeline(userId, id)
  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
}

export async function deleteInvoice(id: number) {
  const userId = await getUserId()
  const supabase = await createClient()

  // Cascade FKs handle items, reports, and related records
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/invoices')
}

// Used by the pipeline stepper to poll status.
export async function getInvoiceStatus(id: number) {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select('status, decision, error_message')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  return data
}
