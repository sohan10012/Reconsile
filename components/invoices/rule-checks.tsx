import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RuleCheck } from '@/lib/types'

const SEVERITY_ICON = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
}

function CheckList({ checks }: { checks: RuleCheck[] }) {
  return (
    <ul className="divide-y divide-border">
      {checks.map((check) => {
        const FailIcon = SEVERITY_ICON[check.severity]
        return (
          <li key={check.id} className="flex items-start gap-3 py-3">
            <span className="mt-0.5">
              {check.passed ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <FailIcon
                  className={cn(
                    'size-4',
                    check.severity === 'critical'
                      ? 'text-destructive'
                      : check.severity === 'warning'
                        ? 'text-warning'
                        : 'text-muted-foreground',
                  )}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{check.label}</p>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[11px] uppercase tracking-wide',
                    check.passed ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {check.passed ? 'Pass' : check.severity}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{check.detail}</p>
              {(check.expected != null || check.actual != null) && (
                <div className="mt-1.5 flex flex-wrap gap-4 font-mono text-xs">
                  {check.expected != null && (
                    <span className="text-muted-foreground">
                      expected:{' '}
                      <span className="text-foreground">{String(check.expected)}</span>
                    </span>
                  )}
                  {check.actual != null && (
                    <span className="text-muted-foreground">
                      actual:{' '}
                      <span className="text-foreground">{String(check.actual)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              w{check.weight}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function SectionHeader({
  title,
  description,
  checks,
}: {
  title: string
  description: string
  checks: RuleCheck[]
}) {
  const passed = checks.filter((c) => c.passed).length
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {passed}/{checks.length}
      </span>
    </div>
  )
}

export function RuleChecks({ checks }: { checks: RuleCheck[] }) {
  if (!checks || checks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No rule evaluation available. Run the pipeline first.
      </p>
    )
  }

  const schemaChecks = checks.filter((c) => c.category === 'schema')
  const businessChecks = checks.filter((c) => c.category !== 'schema')

  return (
    <div className="flex flex-col gap-6">
      {schemaChecks.length > 0 && (
        <section className="flex flex-col gap-1">
          <SectionHeader
            title="Strict schema validation"
            description="Deterministic gate on the raw LLM output — runs before any value is trusted."
            checks={schemaChecks}
          />
          <CheckList checks={schemaChecks} />
        </section>
      )}
      <section className="flex flex-col gap-1">
        <SectionHeader
          title="Deterministic business rules"
          description="Tolerance, arithmetic, and P2P alignment checks executed outside the LLM."
          checks={businessChecks}
        />
        <CheckList checks={businessChecks} />
      </section>
    </div>
  )
}
