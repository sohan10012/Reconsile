'use client'

import { Card } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

type Analytics = {
  decisionBreakdown: { decision: string; label: string; count: number }[]
  topExceptions: { label: string; count: number }[]
  spendByVendor: { vendor: string; amount: number }[]
  avgConfidence: number
  straightThroughRate: number
  totalDecided: number
  openPoCount: number
}

const DECISION_COLOR: Record<string, string> = {
  approve: 'bg-success',
  review: 'bg-warning',
  reject: 'bg-destructive',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </Card>
  )
}

export function AnalyticsView({ data }: { data: Analytics }) {
  const totalDecisions = data.decisionBreakdown.reduce((s, d) => s + d.count, 0)
  const maxSpend = Math.max(1, ...data.spendByVendor.map((s) => s.amount))
  const maxException = Math.max(1, ...data.topExceptions.map((e) => e.count))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Decisions made" value={String(data.totalDecided)} />
        <Stat
          label="Straight-through"
          value={formatPercent(data.straightThroughRate)}
        />
        <Stat label="Avg match confidence" value={formatPercent(data.avgConfidence)} />
        <Stat label="Open POs" value={String(data.openPoCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Decision breakdown */}
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-medium">Decision breakdown</h3>
          {totalDecisions === 0 ? (
            <EmptyHint text="No validated invoices yet." />
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {data.decisionBreakdown.map((d) => (
                  <div
                    key={d.decision}
                    className={cn(DECISION_COLOR[d.decision])}
                    style={{ width: `${(d.count / totalDecisions) * 100}%` }}
                  />
                ))}
              </div>
              <dl className="flex flex-col gap-2">
                {data.decisionBreakdown.map((d) => (
                  <div key={d.decision} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('size-2.5 rounded-full', DECISION_COLOR[d.decision])}
                      />
                      <span className="text-muted-foreground">{d.label}</span>
                    </div>
                    <span className="tabular-nums font-medium">{d.count}</span>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>

        {/* Top exceptions */}
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-medium">Top exception reasons</h3>
          {data.topExceptions.length === 0 ? (
            <EmptyHint text="No rule exceptions recorded." />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topExceptions.map((e) => (
                <li key={e.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="tabular-nums font-medium">{e.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${(e.count / maxException) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Spend by vendor */}
      <Card className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-medium">Spend by vendor</h3>
        {data.spendByVendor.length === 0 ? (
          <EmptyHint text="No spend recorded yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.spendByVendor.map((s) => (
              <li key={s.vendor} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{s.vendor}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(s.amount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(s.amount / maxSpend) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>
  )
}
