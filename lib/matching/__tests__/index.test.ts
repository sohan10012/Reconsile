import { describe, it, expect } from 'vitest'
import {
  normalize,
  levenshtein,
  levenshteinSimilarity,
  tokenSetSimilarity,
  stringSimilarity,
  matchVendor,
  matchPurchaseOrder,
  matchLineItems,
} from '../index'

describe('Fuzzy Matching Core', () => {
  describe('normalize', () => {
    it('should lowercase and strip punctuation and corporate suffixes', () => {
      expect(normalize('Acme Industrial Co., LLC!')).toBe('acmeindustrial')
    })
  })

  describe('levenshtein edit distance', () => {
    it('should calculate correct distance', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3)
      expect(levenshtein('Acme', 'Acme')).toBe(0)
    })
  })

  describe('matchVendor', () => {
    const vendors = [
      { id: 1, name: 'Acme Industrial Supply' },
      { id: 2, name: 'Globex Corporation' },
    ]

    it('should resolve identical vendor name', () => {
      const res = matchVendor('Acme Industrial Supply', vendors)
      expect(res.vendorId).toBe(1)
      expect(res.confidence).toBe(1.0)
    })

    it('should resolve slightly misspelled vendor name', () => {
      const res = matchVendor('Acme Ind Supply', vendors)
      expect(res.vendorId).toBe(1)
      expect(res.confidence).toBeGreaterThan(0.6)
    })

    it('should not resolve unrelated vendor names', () => {
      const res = matchVendor('Initech LLC', vendors)
      expect(res.vendorId).toBeNull()
      expect(res.confidence).toBeLessThan(0.4)
    })
  })

  describe('matchPurchaseOrder', () => {
    const candidates = [
      { id: 101, poNumber: 'PO-2026-0001', vendorName: 'Acme Industrial Supply', totalAmount: 1500.0 },
      { id: 102, poNumber: 'PO-2026-0002', vendorName: 'Globex Corp', totalAmount: 850.5 },
    ]

    it('should match PO number exactly', () => {
      const res = matchPurchaseOrder('PO-2026-0001', 'Acme Industrial Supply', 1500.0, candidates)
      expect(res.poId).toBe(101)
      expect(res.method).toBe('exact')
    })

    it('should match fuzzy with spelling variations and totals', () => {
      const res = matchPurchaseOrder('PO-2026-0010', 'Globex', 850.0, candidates) // typo in number, matches globex/amount
      expect(res.poId).toBe(102)
      expect(res.method).toBe('fuzzy')
    })
  })

  describe('matchLineItems', () => {
    it('should match by SKUs and descriptions optimally', () => {
      const invoiceItems = [
        { description: 'Widget A with custom paint', sku: 'WDG-A', quantity: 2, unitPrice: 20, lineTotal: 40 },
        { description: 'Super Screws size 10', sku: 'SCR-10', quantity: 10, unitPrice: 1, lineTotal: 10 },
      ]

      const poItems = [
        { id: 1, description: 'Super Screws size 10', sku: 'SCR-10', quantity: 10, unitPrice: 1 },
        { id: 2, description: 'Widget A', sku: 'WDG-A', quantity: 2, unitPrice: 20 },
      ]

      const matches = matchLineItems(invoiceItems, poItems)

      expect(matches).toHaveLength(2)
      expect(matches[0].poItemId).toBe(2) // Widget A matched to ID 2
      expect(matches[1].poItemId).toBe(1) // Screws matched to ID 1
    })
  })
})
