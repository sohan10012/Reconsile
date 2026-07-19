'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/page-header'
import { DecisionBadge, StatusBadge } from '@/components/status-badge'
import { RuleChecks } from '@/components/invoices/rule-checks'
import { processInvoice } from '@/app/actions/invoices'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ExtractedInvoice, RuleCheck } from '@/lib/types'
import { ReviewPanel } from '@/components/invoices/review-panel'

type InvoiceRow = {
  id: number
  fileName: string
  fileUrl: string
  filePathname: string | null
  fileType: string | null
  status: string
  decision: string | null
  ocrText: string | null
  extracted: unknown
  invoiceNumber: string | null
  vendorName: string | null
  invoiceDate: string | null
  poNumberRaw: string | null
  currency: string | null
  subtotal: string | null
  tax: string | null
  totalAmount: string | null
  matchConfidence: string | null
  validationScore: string | null
  errorMessage: string | null
}

type ItemRow = {
  id: number
  description: string
  sku: string | null
  quantity: string
  unitPrice: string
  lineTotal: string
  matchScore: string | null
}

type LogRow = {
  id: number
  step: string
  status: string
  message: string | null
  durationMs: number | null
  createdAt: Date
}

type Report = {
  decision: string
  score: string | number
  checks: unknown
} | null

type MatchedPo = {
  poNumber: string
  currency: string
  totalAmount: string
  items: { id: number; description: string; sku: string | null; quantity: string; unitPrice: string; lineTotal: string }[]
} | null

export function InvoiceDetail({
  invoice,
  items,
  report,
  logs,
  matchedPo,
  reviews = [],
}: {
  invoice: InvoiceRow
  items: ItemRow[]
  report: Report
  logs: LogRow[]
  matchedPo: MatchedPo
  reviews?: any[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const currency = invoice.currency ?? 'USD'

  const extracted = invoice.extracted as ExtractedInvoice | null
  const checks = (report?.checks as RuleCheck[] | undefined) ?? []
  const score = report ? Math.round(Number(report.score) * 100) : null

  function rerun() {
    startTransition(async () => {
      try {
        await processInvoice(invoice.id)
        toast.success('Pipeline re-run complete')
        router.refresh()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6 sm:px-8">
        <Link
          href="/invoices"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: '-ml-2 w-fit',
          })}
        >
          <ArrowLeft className="size-4" />
          Back to invoices
        </Link>
      </div>

      <PageHeader
        eyebrow={invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
        title={invoice.vendorName ?? invoice.fileName}
        description={invoice.fileName}
      >
        <StatusBadge status={invoice.status} />
        <DecisionBadge decision={invoice.decision as never} />
        <Button variant="outline" size="sm" onClick={rerun} disabled={isPending}>
          <RefreshCw className={cn('size-4', isPending && 'animate-spin')} />
          Re-run
        </Button>
      </PageHeader>

      <div className="p-6 sm:p-8">
        {invoice.status === 'failed' && invoice.errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Pipeline failed</p>
              <p className="text-destructive/80">{invoice.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Decision summary */}
        {report && (
          <Card className="mb-6 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Validation score
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums">
                    {score}%
                  </span>
                  <DecisionBadge decision={report.decision as never} />
                </div>
              </div>
              <div className="w-full sm:max-w-xs">
                <Progress value={score ?? 0} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {checks.filter((c) => c.passed).length} of {checks.length} checks
                  passed
                </p>
              </div>
            </div>
          </Card>
        )}
        <div className="mb-6">
          <ReviewPanel
            invoiceId={invoice.id}
            currentDecision={invoice.decision}
            reviews={reviews}
          />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rule checks</TabsTrigger>
            <TabsTrigger value="comparison">PO comparison</TabsTrigger>
            <TabsTrigger value="extraction">Extraction JSON</TabsTrigger>
            <TabsTrigger value="ocr">OCR text</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h3 className="mb-4 text-sm font-medium">Extracted fields</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Field label="Invoice #" value={invoice.invoiceNumber} mono />
                  <Field label="Vendor" value={invoice.vendorName} />
                  <Field label="Invoice date" value={invoice.invoiceDate} mono />
                  <Field label="PO number" value={invoice.poNumberRaw} mono />
                  <Field
                    label="Subtotal"
                    value={formatCurrency(invoice.subtotal, currency)}
                    mono
                  />
                  <Field label="Tax" value={formatCurrency(invoice.tax, currency)} mono />
                  <Field
                    label="Total"
                    value={formatCurrency(invoice.totalAmount, currency)}
                    mono
                  />
                  <Field
                    label="Match confidence"
                    value={
                      invoice.matchConfidence
                        ? `${Math.round(Number(invoice.matchConfidence) * 100)}%`
                        : null
                    }
                    mono
                  />
                </dl>
              </Card>
              <Card className="flex flex-col gap-3 p-5">
                <h3 className="text-sm font-medium">Document</h3>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate text-sm">{invoice.fileName}</span>
                </div>
                <a
                  href={
                    invoice.filePathname
                      ? `/api/storage/file?pathname=${encodeURIComponent(invoice.filePathname)}`
                      : invoice.fileUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <ExternalLink className="size-4" />
                  Open original
                </a>
              </Card>
            </div>

            {/* Line items */}
            <Card className="mt-4 overflow-hidden p-0">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-medium">Line items</h3>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No line items extracted.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.description}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {it.sku || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(it.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(it.unitPrice, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(it.lineTotal, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.matchScore ? (
                            <span
                              className={cn(
                                'font-mono text-xs',
                                Number(it.matchScore) >= 0.7
                                  ? 'text-success'
                                  : 'text-warning',
                              )}
                            >
                              {Math.round(Number(it.matchScore) * 100)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Rule checks */}
          <TabsContent value="rules" className="mt-4">
            <Card className="px-5 py-2">
              <RuleChecks checks={checks} />
            </Card>
          </TabsContent>

          {/* PO comparison */}
          <TabsContent value="comparison" className="mt-4">
            {matchedPo ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ComparePanel
                  title="Invoice"
                  subtitle={invoice.invoiceNumber ?? invoice.fileName}
                  rows={[
                    ['Vendor', invoice.vendorName ?? '—'],
                    ['Subtotal', formatCurrency(invoice.subtotal, currency)],
                    ['Tax', formatCurrency(invoice.tax, currency)],
                    ['Total', formatCurrency(invoice.totalAmount, currency)],
                    ['Line items', String(items.length)],
                  ]}
                />
                <ComparePanel
                  title="Purchase order"
                  subtitle={matchedPo.poNumber}
                  rows={[
                    ['Vendor', invoice.vendorName ?? '—'],
                    ['Subtotal', '—'],
                    ['Tax', '—'],
                    [
                      'Total',
                      formatCurrency(matchedPo.totalAmount, matchedPo.currency),
                    ],
                    ['Line items', String(matchedPo.items.length)],
                  ]}
                  compareTotal={{
                    invoice: Number(invoice.totalAmount ?? 0),
                    po: Number(matchedPo.totalAmount),
                  }}
                />
              </div>
            ) : (
              <Card className="py-12 text-center text-sm text-muted-foreground">
                No purchase order was matched to this invoice.
              </Card>
            )}
          </TabsContent>

          {/* Extraction JSON */}
          <TabsContent value="extraction" className="mt-4">
            <Card className="overflow-hidden p-0">
              <pre className="max-h-[500px] overflow-auto p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {extracted
                  ? JSON.stringify(extracted, null, 2)
                  : 'No extraction data available.'}
              </pre>
            </Card>
          </TabsContent>

          {/* OCR text */}
          <TabsContent value="ocr" className="mt-4">
            <Card className="overflow-hidden p-0">
              <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {invoice.ocrText || 'No OCR text available.'}
              </pre>
            </Card>
          </TabsContent>

          {/* Audit trail */}
          <TabsContent value="audit" className="mt-4">
            <Card className="p-5">
              <ol className="relative flex flex-col gap-5 border-l border-border pl-6">
                {logs.map((log) => (
                  <li key={log.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[27px] flex size-3.5 items-center justify-center rounded-full border-2 border-background',
                        log.status === 'failed'
                          ? 'bg-destructive'
                          : log.status === 'success'
                            ? 'bg-success'
                            : 'bg-primary',
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-primary">
                        {log.step}
                      </span>
                      {log.status === 'success' ? (
                        <CheckCircle2 className="size-3.5 text-success" />
                      ) : log.status === 'failed' ? (
                        <XCircle className="size-3.5 text-destructive" />
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </span>
                      {log.durationMs != null && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.durationMs}ms
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-foreground">{log.message}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-sm text-foreground',
          mono && 'font-mono',
          !value && 'text-muted-foreground',
        )}
      >
        {value || '—'}
      </dd>
    </div>
  )
}

function ComparePanel({
  title,
  subtitle,
  rows,
  compareTotal,
}: {
  title: string
  subtitle: string
  rows: [string, string][]
  compareTotal?: { invoice: number; po: number }
}) {
  const delta = compareTotal ? compareTotal.invoice - compareTotal.po : null
  return (
    <Card className="p-5">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p className="mt-0.5 font-medium">{subtitle}</p>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      {delta != null && (
        <div
          className={cn(
            'mt-3 rounded-lg px-3 py-2 text-center font-mono text-xs',
            Math.abs(delta) < 0.01
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning',
          )}
        >
          {Math.abs(delta) < 0.01
            ? 'Totals match'
            : `Variance ${delta > 0 ? '+' : ''}${delta.toFixed(2)}`}
        </div>
      )}
    </Card>
  )
}
