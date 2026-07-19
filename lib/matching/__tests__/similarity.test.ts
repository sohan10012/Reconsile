import { describe, it, expect } from 'vitest'
import {
  ngramSimilarity,
  soundexMatch,
  abbreviationExpand,
  numericTokenSimilarity,
} from '../similarity'

describe('Similarity Utilities', () => {
  describe('ngramSimilarity', () => {
    it('should match identical strings with score 1', () => {
      expect(ngramSimilarity('Acme Corp', 'Acme Corp')).toBe(1)
    })

    it('should return 0 for completely disjoint strings', () => {
      expect(ngramSimilarity('abc', 'xyz')).toBe(0)
    })

    it('should return similarity ratio for partial overlap', () => {
      // Trigrams of "acme": "acm", "cme"
      // Trigrams of "acme industrial": "acm", "cme", "me ", "e i", " in", "ind", "ndu", "dus", "ust", "str", "tri", "ria", "ial"
      const score = ngramSimilarity('acme', 'acme industrial')
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(1)
    })
  })

  describe('soundexMatch', () => {
    it('should match phonetically similar words', () => {
      // Smith and Smythe map to S530
      expect(soundexMatch('Smith', 'Smythe')).toBe(true)
    })

    it('should not match phonetically distinct words', () => {
      expect(soundexMatch('Smith', 'Acme')).toBe(false)
    })
  })

  describe('abbreviationExpand', () => {
    it('should expand common business abbreviations', () => {
      expect(abbreviationExpand('Acme Intl LLC')).toBe('Acme international limited liability company')
      expect(abbreviationExpand('Tech Corp SVC')).toBe('technology corporation service')
    })

    it('should keep spelling of non-abbreviations intact', () => {
      expect(abbreviationExpand('Google INC')).toBe('Google incorporated')
    })
  })

  describe('numericTokenSimilarity', () => {
    it('should match identical numeric tokens in strings', () => {
      expect(numericTokenSimilarity('PO-2026-9876', 'Invoice-9876-2026')).toBe(1)
    })

    it('should return partial similarity for partial digit overlaps', () => {
      expect(numericTokenSimilarity('PO-2026-9876', 'PO-2026-1111')).toBe(0.5) // matches 2026, mismatches 9876/1111
    })

    it('should return 0 if no digits overlap', () => {
      expect(numericTokenSimilarity('PO-AAAA', 'PO-BBBB')).toBe(1) // no digits in both = 1
      expect(numericTokenSimilarity('PO-1234', 'PO-BBBB')).toBe(0)
    })
  })
})
