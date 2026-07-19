import { PageHeader } from '@/components/page-header'
import { AuditLogView } from '@/components/audit/audit-log-view'
import { getAuditLog } from '@/app/actions/dashboard'

interface PageProps {
  searchParams: Promise<{
    page?: string
    step?: string
    status?: string
  }>
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? Number(params.page) : 1
  const step = params.step || undefined
  const status = params.status || undefined
  const pageSize = 50

  const { data, total } = await getAuditLog({
    page,
    pageSize,
    step,
    status,
  })

  // Map database fields to UI log structures
  const logs = data.map((log: any) => ({
    id: Number(log.id),
    invoiceId: log.invoice_id,
    step: log.step,
    status: log.status,
    message: log.message,
    durationMs: log.duration_ms,
    createdAt: new Date(log.created_at),
  }))

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="An immutable, timestamped record of every pipeline step across all invoices."
      />
      <div className="p-6 sm:p-8">
        <AuditLogView
          logs={logs}
          total={total}
          page={page}
          pageSize={pageSize}
          currentStep={step}
          currentStatus={status}
        />
      </div>
    </div>
  )
}
