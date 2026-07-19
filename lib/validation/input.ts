import { z } from 'zod'

// Sanitizes text by trimming and limiting max length
const cleanString = (max: number) =>
  z.string()
    .trim()
    .max(max, { message: `Must not exceed ${max} characters` })

export const vendorInputSchema = z.object({
  name: cleanString(100).min(1, 'Vendor name is required'),
  taxId: cleanString(50).optional().nullable(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: cleanString(30).optional().nullable(),
  address: cleanString(200).optional().nullable(),
  paymentTerms: cleanString(50).optional().nullable(),
})

export const poItemInputSchema = z.object({
  description: cleanString(250).min(1, 'Description is required'),
  sku: cleanString(50).optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price must be positive'),
})

export const poInputSchema = z.object({
  poNumber: cleanString(50).min(1, 'PO number is required'),
  vendorName: cleanString(100).min(1, 'Vendor name is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  taxRate: z.number().nonnegative('Tax rate must be positive'),
  status: z.enum(['open', 'partially_received', 'closed', 'cancelled']),
  items: z.array(poItemInputSchema).min(1, 'At least one line item is required'),
})

export const reviewInputSchema = z.object({
  invoiceId: z.number().int().positive(),
  action: z.enum(['approve', 'reject', 'comment']),
  comment: cleanString(1000).optional().nullable(),
})

export const userSettingsInputSchema = z.object({
  amountTolerancePct: z.number().min(0).max(1.0),
  priceTolerancePct: z.number().min(0).max(1.0),
  autoApproveThreshold: z.number().min(0.5).max(1.0),
  notificationsEnabled: z.boolean(),
})

export function validateVendorInput(input: unknown) {
  return vendorInputSchema.safeParse(input)
}

export function validatePoInput(input: unknown) {
  return poInputSchema.safeParse(input)
}

export function validateReviewInput(input: unknown) {
  return reviewInputSchema.safeParse(input)
}

export function validateUserSettingsInput(input: unknown) {
  return userSettingsInputSchema.safeParse(input)
}
