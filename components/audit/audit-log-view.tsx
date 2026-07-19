'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2, ScrollText, ChevronLeft, ChevronRight, FilterX } from 'lucide-react'

type LogRow = {
  id: number
  invoiceId: number | null
  step: string
  status: string
  message: string | null
  durationMs: number | null
  createdAt: Date | string
}

const STEP_LABEL: Record<string, string> = {
  upload: 'Upload',
  ocr: 'OCR',
  extraction: 'Extraction',
  schema: 'Schema Gate',
  matching: 'Matching',
  rules: 'Rule checks',
  decision: 'Decision',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success')
    return <CheckCircle2 className="size-4 text-success" />
  if (status === 'failed') return <XCircle className="size-4 text-destructive" />
  return <Loader2 className="size-4 text-muted-foreground animate-spin" />
}

interface AuditLogViewProps {
  logs: LogRow[]
  total: number
  page: number
  pageSize: number
  currentStep?: string
  currentStatus?: string
}

export function AuditLogView({
  logs,
  total,
  page,
  pageSize,
  currentStep,
  currentStatus,
}: AuditLogViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const updateUrl = (newParams: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key)
      } else {
        params.set(key, String(val))
      }
    })
    if (!('page' in newParams)) {
      params.delete('page')
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filters strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Step Filter */}
          <Select
            value={currentStep || 'ALL'}
            onValueChange={(val) => updateUrl({ step: val === 'ALL' ? null : val })}
          >
            <SelectTrigger className="w-[150px] bg-background/50 h-9">
              <SelectValue placeholder="All Steps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Steps</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="ocr">OCR</SelectItem>
              <SelectItem value="extraction">Extraction</SelectItem>
              <SelectItem value="schema">Schema Gate</SelectItem>
              <SelectItem value="matching">Matching</SelectItem>
              <SelectItem value="rules">Rule checks</SelectItem>
              <SelectItem value="decision">Decision</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={currentStatus || 'ALL'}
            onValueChange={(val) => updateUrl({ status: val === 'ALL' ? null : val })}
          >
            <SelectTrigger className="w-[150px] bg-background/50 h-9">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="started">Started</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(currentStep || currentStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateUrl({ step: null, status: null })}
              className="h-9 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterX className="size-4" />
              Clear
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Total logs: {total}
        </div>
      </div>

      <Card className="overflow-hidden p-0 relative">
        {isPending && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ScrollText className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No audit events found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try adjusting your filters or verify that invoices have been run through the pipeline.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Step</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <StatusIcon status={log.status} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-mono text-xs uppercase tracking-wider',
                          log.status === 'failed' && 'text-destructive',
                        )}
                      >
                        {STEP_LABEL[log.step] ?? log.step}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-1 text-sm text-muted-foreground">
                        {log.message ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.invoiceId ? (
                        <Link
                          href={`/invoices/${log.invoiceId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          #{log.invoiceId}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {log.durationMs != null ? `${log.durationMs} ms` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateUrl({ page: page - 1 })}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-medium px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateUrl({ page: page + 1 })}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
