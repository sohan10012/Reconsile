'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <Logo />
        <div className="max-w-md">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Deterministic-first verification
          </p>
          <h2 className="mt-4 text-pretty text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Every invoice decision, explained by rules you can audit.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Reconcile pairs AI extraction with a transparent rule engine. No
            black boxes — just an accountable trail from upload to approval.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 border-t border-border pt-8">
          {[
            ['OCR + LLM', 'Extraction'],
            ['Fuzzy + rerank', 'PO matching'],
            ['Weighted rules', 'Decisioning'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="font-mono text-sm font-medium text-foreground">
                {value}
              </dt>
              <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {isSignUp ? 'Get started' : 'Welcome back'}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {isSignUp ? 'Create your account' : 'Sign in to Reconcile'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jane Cooper"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="jane@company.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? 'Please wait…'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
