'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, FileText, Trash2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/page-header'
import { PoStatusBadge } from '@/components/status-badge'
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  type PoItemInput,
} from '@/app/actions/purchase-orders'
import { formatCurrency, formatDate } from '@/lib/format'
import Link from 'next/link'

type Vendor = { id: number; name: string }

type PurchaseOrder = {
  id: number
  poNumber: string
  vendorName: string
  status: string
  currency: string
  orderDate: Date | string
  subtotal: string
  tax: string
  totalAmount: string
}

type DraftItem = {
  description: string
  sku: string
  quantity: string
  unitPrice: string
}

const emptyItem: DraftItem = { description: '', sku: '', quantity: '1', unitPrice: '' }

export function PurchaseOrdersView({
  purchaseOrders,
  vendors,
}: {
  purchaseOrders: PurchaseOrder[]
  vendors: Vendor[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [poNumber, setPoNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [taxRate, setTaxRate] = useState('0')
  const [status, setStatus] = useState('open')
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
        0,
      ),
    [items],
  )
  const tax = useMemo(
    () => (subtotal * (Number(taxRate) || 0)) / 100,
    [subtotal, taxRate],
  )
  const total = subtotal + tax

  function updateItem(index: number, key: keyof DraftItem, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }])
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function resetForm() {
    setPoNumber('')
    setVendorName('')
    setCurrency('USD')
    setTaxRate('0')
    setStatus('open')
    setItems([{ ...emptyItem }])
  }

  function handleCreate() {
    if (!poNumber.trim()) return toast.error('PO number is required')
    if (!vendorName.trim()) return toast.error('Select or enter a vendor')
    const cleanItems: PoItemInput[] = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        sku: it.sku.trim() || undefined,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      }))
    if (cleanItems.length === 0) return toast.error('Add at least one line item')

    startTransition(async () => {
      try {
        await createPurchaseOrder({
          poNumber: poNumber.trim(),
          vendorName: vendorName.trim(),
          currency,
          taxRate: Number(taxRate) || 0,
          status,
          items: cleanItems,
        })
        toast.success('Purchase order created')
        resetForm()
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create PO')
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deletePurchaseOrder(id)
        toast.success('Purchase order deleted')
        router.refresh()
      } catch {
        toast.error('Failed to delete PO')
      }
    })
  }

  // Filter purchase orders on search query
  const filteredPOs = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return purchaseOrders
    return purchaseOrders.filter((po) => {
      return (
        po.poNumber.toLowerCase().includes(q) ||
        po.vendorName.toLowerCase().includes(q) ||
        po.status.toLowerCase().includes(q)
      )
    })
  }, [purchaseOrders, search])

  // Paginate filtered POs
  const totalCount = filteredPOs.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedPOs = useMemo(() => {
    const from = (page - 1) * pageSize
    const to = from + pageSize
    return filteredPOs.slice(from, to)
  }, [filteredPOs, page])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Procurement"
        title="Purchase Orders"
        description="The source of truth invoices are validated against."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-4" />
                  New PO
                </Button>
              }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create purchase order</DialogTitle>
                <DialogDescription>
                  Record the committed quantities and prices for later matching.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="po-number">PO number</Label>
                    <Input
                      id="po-number"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO-2026-0001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="po-vendor">Vendor</Label>
                    {vendors.length > 0 ? (
                      <Select
                        value={vendorName}
                        onValueChange={(v) => setVendorName(v ?? '')}
                      >
                        <SelectTrigger id="po-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.name}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="po-vendor"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        placeholder="Vendor name"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="po-currency">Currency</Label>
                    <Select
                      value={currency}
                      onValueChange={(v) => setCurrency(v ?? 'USD')}
                    >
                      <SelectTrigger id="po-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="po-tax">Tax rate (%)</Label>
                    <Input
                      id="po-tax"
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="po-status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v ?? 'open')}
                    >
                      <SelectTrigger id="po-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="partially_received">
                          Partially received
                        </SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Line items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="size-3.5" />
                      Add line
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_0.8fr_1fr]">
                          <div className="grid gap-1">
                            <Label className="text-xs" htmlFor={`d-${i}`}>
                              Description
                            </Label>
                            <Input
                              id={`d-${i}`}
                              value={it.description}
                              onChange={(e) =>
                                updateItem(i, 'description', e.target.value)
                              }
                              placeholder="Item"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs" htmlFor={`s-${i}`}>
                              SKU
                            </Label>
                            <Input
                              id={`s-${i}`}
                              value={it.sku}
                              onChange={(e) => updateItem(i, 'sku', e.target.value)}
                              placeholder="SKU"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs" htmlFor={`q-${i}`}>
                              Qty
                            </Label>
                            <Input
                              id={`q-${i}`}
                              type="number"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItem(i, 'quantity', e.target.value)
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs" htmlFor={`p-${i}`}>
                              Unit price
                            </Label>
                            <Input
                              id={`p-${i}`}
                              type="number"
                              value={it.unitPrice}
                              onChange={(e) =>
                                updateItem(i, 'unitPrice', e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                          aria-label="Remove line"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 border-t border-border pt-3 text-sm">
                  <div className="flex w-48 justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                  <div className="flex w-48 justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="font-mono">{formatCurrency(tax, currency)}</span>
                  </div>
                  <div className="flex w-48 justify-between font-medium">
                    <span>Total</span>
                    <span className="font-mono">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending ? 'Creating…' : 'Create PO'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 p-6 sm:p-8">
        {/* Search strip */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search POs by number, vendor, status..."
            className="pl-9 bg-card h-9"
          />
        </div>

        {purchaseOrders.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="font-medium">No purchase orders yet</p>
              <p className="text-sm text-muted-foreground">
                Create a PO so uploaded invoices have something to match against.
              </p>
            </div>
          </Card>
        ) : filteredPOs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="font-medium">No matching purchase orders</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="font-mono text-sm font-medium text-foreground hover:text-primary"
                      >
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{po.vendorName}</TableCell>
                    <TableCell>
                      <PoStatusBadge status={po.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(po.orderDate)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(po.totalAmount, po.currency)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(po.id)}
                        disabled={isPending}
                        aria-label={`Delete ${po.poNumber}`}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage(page - 1)}
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
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
