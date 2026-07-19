import { describe, it, expect } from 'vitest'
import { validateInvoiceSchema } from '../schema'
import type { ExtractedInvoice } from '@/lib/types'

describe('Strict Schema Validation Gate', () => {
  const validInvoice: ExtractedInvoice = {
    invoiceNumber: 'INV-1234',
    vendorName: 'Globex Corp',
    invoiceDate: '2026-07-13',
    poNumber: 'PO-5678',
    currency: 'USD',
    subtotal: 100.0,
    tax: 8.5,
    totalAmount: 108.5,
    lineItems: [
      {
        description: 'Item 1',
        sku: 'ITM-1',
        quantity: 2,
        unitPrice: 50.0,
        lineTotal: 100.0,
      },
    ],
  }

  it('should validate a correct invoice extraction', () => {
    const res = validateInvoiceSchema(validInvoice)
    expect(res.valid).toBe(true)
    expect(res.issues).toHaveLength(0)
    expect(res.checks).toHaveLength(8) // should have 8 default checks
    expect(res.checks.every((c) => c.passed)).toBe(true)
  })

  it('should catch missing invoice number as critical failure', () => {
    const invalid = { ...validInvoice, invoiceNumber: null }
    const res = validateInvoiceSchema(invalid)
    expect(res.valid).toBe(false) // critical fails make it invalid
    expect(res.issues).toContain('Missing or empty invoice number in the model output.')
    const numCheck = res.checks.find((c) => c.id === 'schema_invoice_number')
    expect(numCheck?.passed).toBe(false)
  })

  it('should catch non-positive total as critical failure', () => {
    const invalid = { ...validInvoice, totalAmount: -10 }
    const res = validateInvoiceSchema(invalid)
    expect(res.valid).toBe(false)
    const totalCheck = res.checks.find((c) => c.id === 'schema_total_type')
    expect(totalCheck?.passed).toBe(false)
  })

  it('should flag malformed line items as critical failure', () => {
    const invalid = {
      ...validInvoice,
      lineItems: [
        {
          description: '', // empty description is malformed
          sku: null,
          quantity: -2, // negative quantity is malformed
          unitPrice: 50.0,
          lineTotal: -100.0,
        },
      ],
    }
    const res = validateInvoiceSchema(invalid)
    expect(res.valid).toBe(false)
    const lineCheck = res.checks.find((c) => c.id === 'schema_line_items')
    expect(lineCheck?.passed).toBe(false)
  })
})
