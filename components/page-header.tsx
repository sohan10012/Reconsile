import type React from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-pretty text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(children || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {children}
          {actions}
        </div>
      )}
    </div>
  )
}
