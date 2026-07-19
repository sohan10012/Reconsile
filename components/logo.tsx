import { cn } from '@/lib/utils'

export function Logo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        {/* Interlocking check mark — represents matched/reconciled documents */}
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12.5 9 17.5 20 6.5" />
        </svg>
      </div>
      {showText && (
        <span className="text-base font-semibold tracking-tight text-foreground">
          Reconcile
        </span>
      )}
    </div>
  )
}
