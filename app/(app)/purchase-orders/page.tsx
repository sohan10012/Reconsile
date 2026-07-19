import { PurchaseOrdersView } from '@/components/purchase-orders/purchase-orders-view'
import { getPurchaseOrders } from '@/app/actions/purchase-orders'
import { getVendors } from '@/app/actions/vendors'

export default async function PurchaseOrdersPage() {
  const [purchaseOrdersRaw, vendors] = await Promise.all([
    getPurchaseOrders(),
    getVendors(),
  ])

  // Map database purchase order items (snake_case) to PO view model (camelCase)
  const purchaseOrders = purchaseOrdersRaw.map((po: any) => ({
    id: Number(po.id),
    poNumber: po.po_number,
    vendorName: po.vendor_name,
    status: po.status,
    currency: po.currency,
    orderDate: new Date(po.order_date),
    subtotal: String(po.subtotal),
    tax: String(po.tax),
    totalAmount: String(po.total_amount),
  }))

  return (
    <PurchaseOrdersView
      purchaseOrders={purchaseOrders}
      vendors={vendors.map((v: any) => ({ id: Number(v.id), name: v.name }))}
    />
  )
}
