'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/session'
import type { RuleCheck } from '@/lib/types'

export async function getDashboardData() {
  const userId = await getUserId()
  const supabase = await createClient()

  const [invoicesResult, posResult, vendorsResult] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId),
    supabase.from('purchase_orders').select('*').eq('user_id', userId),
    supabase.from('vendors').select('id').eq('user_id', userId),
  ])

  const invoices = invoicesResult.data ?? []
  const pos = posResult.data ?? []
  const vendorCount = vendorsResult.data?.length ?? 0

  const totalInvoices = invoices.length
  const approved = invoices.filter((i: any) => i.decision === 'approve').length
  const review = invoices.filter((i: any) => i.decision === 'review').length
  const rejected = invoices.filter((i: any) => i.decision === 'reject').length
  const pending = invoices.filter((i: any) => !i.decision).length
  const decided = approved + review + rejected

  const approvalRate = decided > 0 ? approved / decided : 0
  const verificationSuccessRate = decided > 0 ? (approved + review) / decided : 0
  const manualReviewRate = decided > 0 ? review / decided : 0

  // Average confidence for matched invoices
  const withConfidence = invoices.filter((i: any) => i.match_confidence != null)
  const avgConfidence =
    withConfidence.length > 0
      ? withConfidence.reduce((s: any, i: any) => s + Number(i.match_confidence), 0) /
        withConfidence.length
      : 0

  // Average processing time from audit logs
  const { data: logData } = await supabase
    .from('audit_logs')
    .select('duration_ms')
    .eq('user_id', userId)
    .not('duration_ms', 'is', null)

  const durations = (logData ?? []).map((l: any) => l.duration_ms!).filter(Boolean)
  const avgProcessingMs =
    durations.length > 0 ? durations.reduce((s: any, d: any) => s + d, 0) / durations.length : 0

  // Hallucinations prevented: count checks where deterministic validation caught an issue
  const { data: reportData } = await supabase
    .from('validation_reports')
    .select('checks')
    .eq('user_id', userId)

  let hallucinationsPrevented = 0
  for (const r of reportData ?? []) {
    const checks = r.checks as RuleCheck[] | null
    if (!checks) continue
    hallucinationsPrevented += checks.filter(
      (c: any) => !c.passed && c.category === 'schema',
    ).length
  }

  const poCount = pos.length
  const totalPoValue = pos.reduce((s: any, p: any) => s + Number(p.total_amount), 0)
  const autoProcessedValue = invoices
    .filter((i: any) => i.decision === 'approve')
    .reduce((s: any, i: any) => s + Number(i.total_amount ?? 0), 0)

  // Recent invoices for the dashboard list
  const recentInvoices = invoices
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8)

  return {
    stats: {
      totalInvoices,
      approved,
      review,
      rejected,
      pending,
      approvalRate,
      verificationSuccessRate,
      manualReviewRate,
      avgConfidence,
      avgProcessingMs,
      hallucinationsPrevented,
      poCount,
      totalPoValue,
      autoProcessedValue,
      vendorCount,
    },
    recentInvoices,
  }
}

export async function getAnalyticsData() {
  const userId = await getUserId()
  const supabase = await createClient()

  const [invoicesResult, posResult, reportResult] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId),
    supabase.from('purchase_orders').select('*').eq('user_id', userId),
    supabase.from('validation_reports').select('*').eq('user_id', userId),
  ])

  const invoices = invoicesResult.data ?? []
  const pos = posResult.data ?? []
  const reports = reportResult.data ?? []

  const decided = invoices.filter((i: any) => i.decision != null)
  const totalDecided = decided.length

  // Decision breakdown
  const decisionCounts: Record<string, number> = { approve: 0, review: 0, reject: 0 }
  for (const inv of decided as any[]) {
    if (inv.decision) decisionCounts[inv.decision] = (decisionCounts[inv.decision] ?? 0) + 1
  }
  const decisionBreakdown = [
    { decision: 'approve', label: 'Approved', count: decisionCounts.approve ?? 0 },
    { decision: 'review', label: 'Needs review', count: decisionCounts.review ?? 0 },
    { decision: 'reject', label: 'Rejected', count: decisionCounts.reject ?? 0 },
  ]

  // Top exception reasons from failed rule checks
  const exceptionMap = new Map<string, number>()
  for (const report of reports as any[]) {
    const checks = report.checks as RuleCheck[] | null
    if (!checks) continue
    for (const c of checks) {
      if (!c.passed) {
        exceptionMap.set(c.label, (exceptionMap.get(c.label) ?? 0) + 1)
      }
    }
  }
  const topExceptions = Array.from(exceptionMap.entries())
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }))

  // Spend by vendor
  const vendorSpend = new Map<string, number>()
  for (const inv of invoices as any[]) {
    if (inv.decision === 'approve' && inv.vendor_name && inv.total_amount) {
      vendorSpend.set(
        inv.vendor_name,
        (vendorSpend.get(inv.vendor_name) ?? 0) + Number(inv.total_amount),
      )
    }
  }
  const spendByVendor = Array.from(vendorSpend.entries())
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 8)
    .map(([vendor, amount]) => ({ vendor, amount }))

  // Average confidence
  const withConf = invoices.filter((i: any) => i.match_confidence != null)
  const avgConfidence =
    withConf.length > 0
      ? withConf.reduce((s: any, i: any) => s + Number(i.match_confidence), 0) / withConf.length
      : 0

  // Straight-through rate (auto-approved without review)
  const straightThroughRate =
    totalDecided > 0 ? (decisionCounts.approve ?? 0) / totalDecided : 0

  const openPoCount = pos.filter((p: any) => p.status === 'open').length

  return {
    decisionBreakdown,
    topExceptions,
    spendByVendor,
    avgConfidence,
    straightThroughRate,
    totalDecided,
    openPoCount,
  }
}

export async function getAuditLog(opts?: {
  page?: number
  pageSize?: number
  step?: string
  status?: string
}) {
  const userId = await getUserId()
  const supabase = await createClient()

  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 200
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.step) {
    query = query.eq('step', opts.step)
  }
  if (opts?.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return {
    data: data ?? [],
    total: count ?? 0,
  }
}
