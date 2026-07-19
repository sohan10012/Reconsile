import { VendorsView } from '@/components/vendors/vendors-view'
import { getVendors } from '@/app/actions/vendors'

export default async function VendorsPage() {
  const vendorsRaw = await getVendors()

  // Map database vendor items (snake_case) to vendor view model (camelCase)
  const vendors = vendorsRaw.map((v: any) => ({
    id: Number(v.id),
    name: v.name,
    taxId: v.tax_id,
    email: v.email,
    phone: v.phone,
    address: v.address,
    paymentTerms: v.payment_terms,
    createdAt: new Date(v.created_at),
  }))

  return <VendorsView vendors={vendors} />
}
