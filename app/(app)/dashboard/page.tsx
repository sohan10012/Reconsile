import Link from 'next/link'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Upload,
  ShieldCheck,
  Gauge,
  ShieldAlert,
  Timer,
  UserCheck,
} from 'lucide-react'
import { getDashboardData } from '@/app/actions/dashboard'
import { PageHeader } from '@/components/page-header'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DecisionBadge, StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const { stats, recentInvoices } = await getDashboardData()

  const kpis = [
    {
      label: 'Total invoices',
      value: stats.totalInvoices.toLocaleString(),
      icon: FileText,
      hint: `${stats.pending} in progress`,
      tone: 'default' as const,
    },
    {
      label: 'Auto-approved',
      value: stats.approved.toLocaleString(),
      icon: CheckCircle2,
      hint: `${formatPercent(stats.approvalRate)} approval rate`,
      tone: 'success' as const,
    },
    {
      label: 'Needs review',
      value: stats.review.toLocaleString(),
      icon: AlertTriangle,
      hint: 'Flagged by rules',
      tone: 'warning' as const,
    },
    {
      label: 'Rejected',
      value: stats.rejected.toLocaleString(),
      icon: XCircle,
      hint: 'Critical failures',
      tone: 'destructive' as const,
    },
  ]

  const formatMs = (ms: number) =>
    ms === 0 ? '—' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`

  const verificationMetrics = [
    {
      label: 'Verification success rate',
      value: formatPercent(stats.verificationSuccessRate),
      hint: 'Approved or cleared for review',
      icon: ShieldCheck,
    },
    {
      label: 'Avg. confidence score',
      value: formatPercent(stats.avgConfidence),
      hint: 'Mean PO match confidence',
      icon: Gauge,
    },
    {
      label: 'Hallucinations prevented',
      value: stats.hallucinationsPrevented.toLocaleString(),
      hint: 'Deterministic checks that caught bad values',
      icon: ShieldAlert,
    },
    {
      label: 'Avg. processing time',
      value: formatMs(stats.avgProcessingMs),
      hint: 'End-to-end pipeline duration',
      icon: Timer,
    },
    {
      label: 'Manual review rate',
      value: formatPercent(stats.manualReviewRate),
      hint: 'Share requiring a human',
      icon: UserCheck,
    },
  ]

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Monitor invoice throughput and the health of your accounts-payable pipeline."
      >
        <Link href="/invoices" className={buttonVariants()}>
          <Upload className="size-4" />
          Upload invoice
        </Link>
      </PageHeader>

      <div className="space-y-6 p-6 sm:p-8">
        {/* KPI grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.label} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <Icon
                    className={cn(
                      'size-4',
                      kpi.tone === 'success' && 'text-success',
                      kpi.tone === 'warning' && 'text-warning',
                      kpi.tone === 'destructive' && 'text-destructive',
                      kpi.tone === 'default' && 'text-muted-foreground',
                    )}
                  />
                </div>
                <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
              </Card>
            )
          })}
        </div>

        {/* Zero-hallucination verification metrics */}
        <Card className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Zero-hallucination metrics
            </h2>
            <p className="text-xs text-muted-foreground">
              Health of the deterministic verification layer
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {verificationMetrics.map((m) => {
              const Icon = m.icon
              return (
                <div key={m.label} className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    <p className="text-xs font-medium">{m.label}</p>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
                    {m.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">
                    {m.hint}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Value + counts strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              PO value under management
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {formatCurrency(stats.totalPoValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {stats.poCount} purchase orders
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Auto-approved value
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-success">
              {formatCurrency(stats.autoProcessedValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cleared without manual touch
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Active vendors
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {stats.vendorCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered suppliers
            </p>
          </Card>
        </div>

        {/* Recent invoices */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent invoices
              </h2>
              <p className="text-xs text-muted-foreground">
                Latest documents through the pipeline
              </p>
            </div>
            <Link
              href="/invoices"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              View all
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No invoices yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload your first invoice to run the verification pipeline.
                </p>
              </div>
              <Link
                href="/invoices"
                className={buttonVariants({ size: 'sm', className: 'mt-1' })}
              >
                <Upload className="size-4" />
                Upload invoice
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentInvoices.map((inv: any) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {inv.invoiceNumber
                          ? `Invoice ${inv.invoiceNumber}`
                          : inv.fileName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.vendorName ?? 'Unknown vendor'} ·{' '}
                        {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <div className="hidden font-mono text-sm text-foreground sm:block">
                      {formatCurrency(inv.totalAmount, inv.currency ?? 'USD')}
                    </div>
                    <StatusBadge status={inv.status} />
                    <DecisionBadge decision={inv.decision as never} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
