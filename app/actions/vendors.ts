'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/session'
import { validateVendorInput } from '@/lib/validation/input'
import { revalidatePath } from 'next/cache'

export async function getVendors() {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createVendor(input: {
  name: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
}) {
  const userId = await getUserId()

  // Input validation & sanitation
  const validation = validateVendorInput(input)
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message)
  }
  const cleanData = validation.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      user_id: userId,
      name: cleanData.name,
      tax_id: cleanData.taxId || null,
      email: cleanData.email || null,
      phone: cleanData.phone || null,
      address: cleanData.address || null,
      payment_terms: cleanData.paymentTerms || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/vendors')
  return data
}

export async function deleteVendor(id: number) {
  if (!id || typeof id !== 'number') throw new Error('Invalid ID')

  const userId = await getUserId()
  const supabase = await createClient()

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/vendors')
}
