'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/session'
import { validatePoInput } from '@/lib/validation/input'
import { revalidatePath } from 'next/cache'

export interface PoItemInput {
  description: string
  sku?: string
  quantity: number
  unitPrice: number
}

export async function getPurchaseOrders() {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPurchaseOrder(id: number) {
  if (!id || typeof id !== 'number') return null

  const userId = await getUserId()
  const supabase = await createClient()

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (poError || !po) return null

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*')
    .eq('po_id', id)
    .eq('user_id', userId)

  return { ...po, items: items ?? [] }
}

export async function createPurchaseOrder(input: {
  poNumber: string
  vendorName: string
  currency: string
  taxRate: number
  status: string
  items: PoItemInput[]
}) {
  const userId = await getUserId()

  // Input validation & sanitation
  const validation = validatePoInput(input)
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message)
  }
  const cleanData = validation.data

  const subtotal = cleanData.items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0,
  )
  const tax = Number(((subtotal * cleanData.taxRate) / 100).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

  const supabase = await createClient()

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      user_id: userId,
      po_number: cleanData.poNumber,
      vendor_name: cleanData.vendorName,
      currency: cleanData.currency,
      status: cleanData.status,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total_amount: total,
    })
    .select()
    .single()

  if (poError || !po) throw new Error(poError?.message ?? 'Failed to create PO')

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(
      cleanData.items.map((it) => ({
        user_id: userId,
        po_id: po.id,
        description: it.description,
        sku: it.sku || null,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice.toFixed(2)),
        line_total: Number((it.quantity * it.unitPrice).toFixed(2)),
      })),
    )

  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/purchase-orders')
  return po
}

export async function deletePurchaseOrder(id: number) {
  if (!id || typeof id !== 'number') throw new Error('Invalid ID')

  const userId = await getUserId()
  const supabase = await createClient()

  // Items are cascade-deleted by FK
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/purchase-orders')
}
