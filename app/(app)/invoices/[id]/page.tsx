import { notFound } from 'next/navigation'
import { getInvoice } from '@/app/actions/invoices'
import { getPurchaseOrder } from '@/app/actions/purchase-orders'
import { InvoiceDetail } from '@/components/invoices/invoice-detail'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getInvoice(Number(id))
  if (!data) notFound()

  const { invoice: invRaw, items: itemsRaw, report, logs: logsRaw, reviews } = data

  // Map invoice database record (snake_case) to InvoiceRow (camelCase)
  const invoice = {
    id: invRaw.id,
    fileName: invRaw.file_name,
    fileUrl: invRaw.file_url,
    filePathname: invRaw.file_pathname,
    fileType: invRaw.file_type,
    status: invRaw.status,
    decision: invRaw.decision,
    ocrText: invRaw.ocr_text,
    extracted: invRaw.extracted,
    invoiceNumber: invRaw.invoice_number,
    vendorName: invRaw.vendor_name,
    invoiceDate: invRaw.invoice_date,
    poNumberRaw: invRaw.po_number_raw,
    currency: invRaw.currency,
    subtotal: invRaw.subtotal != null ? String(invRaw.subtotal) : null,
    tax: invRaw.tax != null ? String(invRaw.tax) : null,
    totalAmount: invRaw.total_amount != null ? String(invRaw.total_amount) : null,
    matchConfidence: invRaw.match_confidence != null ? String(invRaw.match_confidence) : null,
    validationScore: invRaw.validation_score != null ? String(invRaw.validation_score) : null,
    errorMessage: invRaw.error_message,
  }

  // Map items database records
  const items = itemsRaw.map((it: any) => ({
    id: Number(it.id),
    description: it.description,
    sku: it.sku,
    quantity: String(it.quantity),
    unitPrice: String(it.unit_price),
    lineTotal: String(it.line_total),
    matchScore: it.match_score != null ? String(it.match_score) : null,
  }))

  // Map logs database records
  const logs = logsRaw.map((log: any) => ({
    id: Number(log.id),
    step: log.step,
    status: log.status,
    message: log.message,
    durationMs: log.duration_ms,
    createdAt: new Date(log.created_at),
  }))

  let matchedPo = null
  if (invRaw.matched_po_id) {
    const po = await getPurchaseOrder(invRaw.matched_po_id)
    if (po) {
      matchedPo = {
        poNumber: po.po_number,
        currency: po.currency,
        totalAmount: String(po.total_amount),
        items: po.items.map((it: any) => ({
          id: Number(it.id),
          description: it.description,
          sku: it.sku,
          quantity: String(it.quantity),
          unitPrice: String(it.unit_price),
          lineTotal: String(it.line_total),
        })),
      }
    }
  }

  return (
    <InvoiceDetail
      invoice={invoice}
      items={items}
      report={report ?? null}
      logs={logs}
      matchedPo={matchedPo}
      reviews={reviews}
    />
  )
}
