import type React from 'react'
import { requireSession } from '@/lib/session'
import { AppSidebar } from '@/components/app-sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <AppSidebar
        user={{
          name: session.user.name ?? '',
          email: session.user.email,
        }}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
