import { describe, it, expect } from 'vitest'
import { crossEncoderRerank } from '../reranker'

describe('Cross-Encoder Reranker Surrogate', () => {
  it('should rank the closest candidate to the top', () => {
    const query = 'PO-2026-9999 Acme'
    const candidates = [
      { id: 1, text: 'PO-2026-1111 Globex Corp', baseScore: 0.3 },
      { id: 2, text: 'PO-2026-9999 Acme Industrial', baseScore: 0.75 },
      { id: 3, text: 'PO-2026-5555 Initech', baseScore: 0.1 },
    ]

    const result = crossEncoderRerank(query, candidates)

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(2) // Closest candidate is PO-2026-9999 Acme
    expect(result[0].finalScore).toBeGreaterThan(result[1].finalScore)
  })

  it('should apply prefix and numeric token bonuses correctly', () => {
    const query = 'PO-12345'
    const candidates = [
      { id: 1, text: 'PO-12345 Acme Corp', baseScore: 0.8 },
      { id: 2, text: 'Invoice-12345 Acme Corp', baseScore: 0.6 },
    ]

    const result = crossEncoderRerank(query, candidates)
    expect(result[0].id).toBe(1) // PO-12345 should rank higher due to prefix matching PO-12345
  })
})
