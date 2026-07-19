import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Server-side session helpers.
// `getUserId` throws (for server actions); `requireSession` redirects (for pages/layouts).

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserId(): Promise<string> {
  const user = await getSession()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

export async function requireSession() {
  const user = await getSession()
  if (!user) redirect('/sign-in')
  return {
    user: {
      id: user.id,
      name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? '',
      email: user.email ?? '',
    },
  }
}
