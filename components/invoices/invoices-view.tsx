'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Upload,
  FileText,
  Loader2,
  Search,
  Trash2,
  MoreHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from 'lucide-react'
import { toast } from 'sonner'
import { createInvoice, processInvoice, deleteInvoice } from '@/app/actions/invoices'
import { PageHeader } from '@/components/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DecisionBadge, StatusBadge } from '@/components/status-badge'
import { PipelineStepper } from '@/components/invoices/pipeline-stepper'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type Invoice = {
  id: number
  fileName: string
  invoiceNumber: string | null
  vendorName: string | null
  totalAmount: string | null
  currency: string | null
  status: string
  decision: string | null
  createdAt: Date
}

interface InvoicesViewProps {
  initialInvoices: Invoice[]
  total: number
  page: number
  pageSize: number
  currentStatus?: string
  currentDecision?: string
  currentSearch?: string
}

export function InvoicesView({
  initialInvoices,
  total,
  page,
  pageSize,
  currentStatus,
  currentDecision,
  currentSearch,
}: InvoicesViewProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [query, setQuery] = useState(currentSearch || '')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Handle URL updates for filters
  const updateUrl = (newParams: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key)
      } else {
        params.set(key, String(val))
      }
    })
    // Reset page to 1 if filters change (except when changing the page itself)
    if (!('page' in newParams)) {
      params.delete('page')
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query !== (currentSearch || '')) {
        updateUrl({ search: query })
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [query])

  const totalPages = Math.ceil(total / pageSize)

  const handleExport = () => {
    try {
      const headers = ['ID', 'File Name', 'Invoice Number', 'Vendor Name', 'Total Amount', 'Currency', 'Status', 'Decision', 'Date']
      const rows = initialInvoices.map((inv) => [
        inv.id,
        `"${inv.fileName.replace(/"/g, '""')}"`,
        inv.invoiceNumber ? `"${inv.invoiceNumber.replace(/"/g, '""')}"` : '',
        inv.vendorName ? `"${inv.vendorName.replace(/"/g, '""')}"` : '',
        inv.totalAmount || '0.00',
        inv.currency || 'USD',
        inv.status,
        inv.decision || 'Pending',
        inv.createdAt.toISOString(),
      ])
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `reconcile_invoices_${Date.now()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Invoices exported successfully')
    } catch {
      toast.error('Failed to export invoices')
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Accounts payable"
        title="Invoices"
        description="Upload invoices to run the verification pipeline and review each decision."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="size-4" />
            Export CSV
          </Button>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Upload className="size-4" />
                  Upload invoice
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload invoice</DialogTitle>
                <DialogDescription>
                  PDF or image. The pipeline will transcribe, extract, match, and
                  validate it automatically.
                </DialogDescription>
              </DialogHeader>
              <UploadPanel
                onDone={() => {
                  setUploadOpen(false)
                  router.refresh()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="space-y-4 p-6 sm:p-8">
        {/* Search and Filters Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoices, vendors..."
              className="pl-9 bg-background/50 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select
              value={currentStatus || 'ALL'}
              onValueChange={(val) => updateUrl({ status: val === 'ALL' ? null : val })}
            >
              <SelectTrigger className="w-[140px] bg-background/50 h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="extracted">Extracted</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Decision Filter */}
            <Select
              value={currentDecision || 'ALL'}
              onValueChange={(val) => updateUrl({ decision: val === 'ALL' ? null : val })}
            >
              <SelectTrigger className="w-[140px] bg-background/50 h-9">
                <SelectValue placeholder="All Decisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Decisions</SelectItem>
                <SelectItem value="approve">Approved</SelectItem>
                <SelectItem value="review">Needs Review</SelectItem>
                <SelectItem value="reject">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {(currentStatus || currentDecision || currentSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  updateUrl({ status: null, decision: null, search: null })
                }}
                className="h-9 px-2 text-muted-foreground hover:text-foreground gap-1"
              >
                <FilterX className="size-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <Card className="overflow-hidden p-0 relative">
          {isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}

          {initialInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {query || currentStatus || currentDecision ? 'No matching invoices' : 'No invoices yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {query || currentStatus || currentDecision
                    ? 'Try adjusting your search filters.'
                    : 'Upload your first invoice to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialInvoices.map((inv) => (
                    <TableRow key={inv.id} className="group">
                      <TableCell>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {inv.invoiceNumber ?? inv.fileName}
                        </Link>
                        {inv.invoiceNumber && (
                          <p className="truncate text-xs text-muted-foreground">
                            {inv.fileName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.vendorName ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(inv.totalAmount, inv.currency ?? 'USD')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <DecisionBadge decision={inv.decision as never} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell>
                        <RowActions id={inv.id} onChange={() => router.refresh()} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => updateUrl({ page: page - 1 })}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => updateUrl({ page: page + 1 })}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function RowActions({ id, onChange }: { id: number; onChange: () => void }) {
  const [pending, start] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            start(async () => {
              try {
                await processInvoice(id)
                toast.success('Pipeline re-run complete')
                onChange()
              } catch (e) {
                toast.error((e as Error).message)
              }
            })
          }
        >
          Re-run pipeline
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            start(async () => {
              try {
                await deleteInvoice(id)
                toast.success('Invoice deleted')
                onChange()
              } catch (e) {
                toast.error((e as Error).message)
              }
            })
          }
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UploadPanel({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFile(file: File) {
    setFileName(file.name)
    setPhase('uploading')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      const blob = (await res.json()) as {
        url: string
        pathname?: string
        fileType?: string
      }

      setPhase('processing')
      setStepIndex(1)
      const invoice = await createInvoice({
        fileName: file.name,
        fileUrl: blob.url,
        filePathname: blob.pathname,
        fileType: file.type,
      })

      // Advance the stepper while the server pipeline runs.
      const timer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, 5))
      }, 900)

      try {
        await processInvoice(invoice.id)
        setStepIndex(6)
        toast.success('Invoice processed')
        onDone()
      } finally {
        clearInterval(timer)
      }
    } catch (e) {
      toast.error((e as Error).message || 'Upload failed')
      setPhase('idle')
      setStepIndex(0)
      setFileName(null)
    }
  }

  if (phase !== 'idle') {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="truncate text-sm text-foreground">{fileName}</span>
        </div>
        {phase === 'uploading' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Uploading to secure storage...
          </div>
        ) : (
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Verification pipeline
            </p>
            <PipelineStepper activeIndex={stepIndex} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="py-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-accent/40',
          dragging && 'border-primary bg-accent/60',
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Drop invoice here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, PNG, JPG or WEBP up to 15MB
          </p>
        </div>
      </button>
    </div>
  )
}
