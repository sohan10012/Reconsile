import { cn } from '@/lib/utils'
import type { Decision, InvoiceStatus } from '@/lib/types'

const DECISION_STYLES: Record<Decision, string> = {
  approve: 'border-success/30 bg-success/10 text-success',
  review: 'border-warning/40 bg-warning/10 text-warning',
  reject: 'border-destructive/30 bg-destructive/10 text-destructive',
}

const DECISION_LABEL: Record<Decision, string> = {
  approve: 'Approved',
  review: 'Needs review',
  reject: 'Rejected',
}

export function DecisionBadge({
  decision,
  className,
}: {
  decision: Decision | null | undefined
  className?: string
}) {
  if (!decision) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground',
          className,
        )}
      >
        Pending
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        DECISION_STYLES[decision],
        className,
      )}
    >
      {DECISION_LABEL[decision]}
    </span>
  )
}

const PO_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  partially_received: 'Partially received',
  closed: 'Closed',
}

export function PoStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground',
        status === 'closed' && 'border-success/30 bg-success/10 text-success',
        className,
      )}
    >
      {PO_STATUS_LABEL[status] ?? status}
    </span>
  )
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing',
  extracted: 'Extracted',
  matched: 'Matched',
  validated: 'Validated',
  failed: 'Failed',
}

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  const s = (status ?? 'uploaded') as InvoiceStatus
  const isFailed = s === 'failed'
  const isProcessing = s === 'processing'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        isFailed
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {isProcessing && (
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      )}
      {STATUS_LABEL[s] ?? status}
    </span>
  )
}
