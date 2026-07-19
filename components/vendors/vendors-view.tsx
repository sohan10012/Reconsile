'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Building2, Trash2, Mail, Phone, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
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
import { createVendor, deleteVendor } from '@/app/actions/vendors'
import { formatDate } from '@/lib/format'

type Vendor = {
  id: number
  name: string
  taxId: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  createdAt: Date | string
}

export function VendorsView({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [form, setForm] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleCreate() {
    if (!form.name.trim()) {
      toast.error('Vendor name is required')
      return
    }
    startTransition(async () => {
      try {
        await createVendor(form)
        toast.success('Vendor added')
        setForm({
          name: '',
          taxId: '',
          email: '',
          phone: '',
          address: '',
          paymentTerms: '',
        })
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add vendor')
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteVendor(id)
        toast.success('Vendor removed')
        router.refresh()
      } catch {
        toast.error('Failed to remove vendor')
      }
    })
  }

  // Filter vendors on search
  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return vendors
    return vendors.filter((v) => {
      return (
        v.name.toLowerCase().includes(q) ||
        (v.taxId && v.taxId.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q))
      )
    })
  }, [vendors, search])

  // Paginate filtered vendors
  const total = filteredVendors.length
  const totalPages = Math.ceil(total / pageSize)
  const paginatedVendors = useMemo(() => {
    const from = (page - 1) * pageSize
    const to = from + pageSize
    return filteredVendors.slice(from, to)
  }, [filteredVendors, page])

  // Reset page if search changes
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Master data"
        title="Vendors"
        description="Suppliers used to resolve invoices during matching."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-4" />
                  Add vendor
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add vendor</DialogTitle>
                <DialogDescription>
                  Register a supplier so invoices can be matched to it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="v-name">Vendor name</Label>
                  <Input
                    id="v-name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Acme Industrial Supply"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="v-tax">Tax ID</Label>
                    <Input
                      id="v-tax"
                      value={form.taxId}
                      onChange={(e) => set('taxId', e.target.value)}
                      placeholder="EIN / VAT"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="v-terms">Payment terms</Label>
                    <Input
                      id="v-terms"
                      value={form.paymentTerms}
                      onChange={(e) => set('paymentTerms', e.target.value)}
                      placeholder="Net 30"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="v-email">Email</Label>
                    <Input
                      id="v-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="ap@acme.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="v-phone">Phone</Label>
                    <Input
                      id="v-phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="+1 555 010 1234"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="v-address">Address</Label>
                  <Input
                    id="v-address"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="123 Market St, Springfield"
                  />
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
                  {isPending ? 'Saving…' : 'Save vendor'}
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
            placeholder="Search vendors by name, tax ID..."
            className="pl-9 bg-card h-9"
          />
        </div>

        {vendors.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="font-medium">No vendors yet</p>
              <p className="text-sm text-muted-foreground">
                Add your suppliers so invoices can be matched during verification.
              </p>
            </div>
          </Card>
        ) : filteredVendors.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="font-medium">No matching vendors</p>
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{v.name}</span>
                        {v.address ? (
                          <span className="text-xs text-muted-foreground">
                            {v.address}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {v.taxId || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {v.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3" />
                            {v.email}
                          </span>
                        ) : null}
                        {v.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3" />
                            {v.phone}
                          </span>
                        ) : null}
                        {!v.email && !v.phone ? '—' : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.paymentTerms || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(v.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(v.id)}
                        disabled={isPending}
                        aria-label={`Delete ${v.name}`}
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
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
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
