import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPurchaseOrder } from '@/app/actions/purchase-orders'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { PoStatusBadge } from '@/components/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const rawPo = await getPurchaseOrder(Number(id))
  if (!rawPo) notFound()

  // Map database purchase order (snake_case) to PO detail view model (camelCase)
  const po = {
    poNumber: rawPo.po_number,
    vendorName: rawPo.vendor_name,
    orderDate: new Date(rawPo.order_date),
    status: rawPo.status,
    currency: rawPo.currency,
    subtotal: String(rawPo.subtotal),
    tax: String(rawPo.tax),
    totalAmount: String(rawPo.total_amount),
    items: rawPo.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      sku: item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/purchase-orders"
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: 'w-fit -ml-2',
        })}
      >
        <ArrowLeft className="size-4" />
        Back to purchase orders
      </Link>

      <PageHeader
        eyebrow="Purchase order"
        title={po.poNumber}
        description={`${po.vendorName} · ${formatDate(po.orderDate)}`}
        actions={<PoStatusBadge status={po.status} />}
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.sku || '—'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.unitPrice, po.currency)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.lineTotal, po.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex w-56 justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{formatCurrency(po.subtotal, po.currency)}</span>
        </div>
        <div className="flex w-56 justify-between text-muted-foreground">
          <span>Tax</span>
          <span className="font-mono">{formatCurrency(po.tax, po.currency)}</span>
        </div>
        <div className="flex w-56 justify-between text-base font-medium">
          <span>Total</span>
          <span className="font-mono">
            {formatCurrency(po.totalAmount, po.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}
