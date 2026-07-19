'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          Something went wrong
        </h1>
        <p className="max-w-md text-pretty text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. You can try
          again, and if the problem persists, contact your administrator.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
