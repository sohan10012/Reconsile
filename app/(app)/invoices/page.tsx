import { getInvoices } from '@/app/actions/invoices'
import { InvoicesView } from '@/components/invoices/invoices-view'

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    decision?: string
    search?: string
  }>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? Number(params.page) : 1
  const status = params.status || undefined
  const decision = params.decision || undefined
  const search = params.search || undefined

  const { data, total, pageSize } = await getInvoices({
    page,
    pageSize: 25,
    status,
    decision,
    search,
  })

  // Map snake_case fields to camelCase expected by the component
  const invoices = data.map((inv: any) => ({
    id: Number(inv.id),
    fileName: inv.file_name,
    invoiceNumber: inv.invoice_number,
    vendorName: inv.vendor_name,
    totalAmount: inv.total_amount != null ? String(inv.total_amount) : null,
    currency: inv.currency,
    status: inv.status,
    decision: inv.decision,
    createdAt: new Date(inv.created_at),
  }))

  return (
    <InvoicesView
      initialInvoices={invoices}
      total={total}
      page={page}
      pageSize={pageSize}
      currentStatus={status}
      currentDecision={decision}
      currentSearch={search}
    />
  )
}
