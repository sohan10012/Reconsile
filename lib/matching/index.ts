// Deterministic fuzzy matching utilities.
// These power vendor resolution, PO resolution, and line-item alignment.

import type {
  ExtractedLineItem,
  LineItemMatch,
  PoMatchResult,
  VendorMatchResult,
} from "@/lib/types"
import { abbreviationExpand, soundexMatch, ngramSimilarity } from "./similarity"

// --- String similarity -----------------------------------------------------

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|corp|company|gmbh|plc)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

// Levenshtein edit distance.
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const prev = new Array(n + 1)
  const curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

// Normalized Levenshtein similarity in [0, 1].
export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Token-set (Jaccard) similarity: robust to word ordering.
export function tokenSetSimilarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter(Boolean))
  const tb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean))
  if (ta.size === 0 && tb.size === 0) return 1
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

// Combined string similarity used for names/descriptions.
export function stringSimilarity(a: string, b: string): number {
  const normA = normalize(a)
  const normB = normalize(b)
  const lev = levenshteinSimilarity(normA, normB)
  const tok = tokenSetSimilarity(a, b)
  // Weighted blend: token-set handles reordering, Levenshtein handles typos.
  return 0.6 * lev + 0.4 * tok
}

// --- Vendor matching -------------------------------------------------------

export interface VendorCandidate {
  id: number
  name: string
}

export function matchVendor(
  extractedName: string | null,
  vendors: VendorCandidate[],
): VendorMatchResult {
  if (!extractedName || vendors.length === 0) {
    return { vendorId: null, vendorName: null, confidence: 0, candidates: [] }
  }

  const scored = vendors
    .map((v) => {
      // 1. Direct standard similarity
      let score = stringSimilarity(extractedName, v.name)

      // 2. Try expanding abbreviations (e.g. Intl -> International)
      const expExtracted = abbreviationExpand(extractedName)
      const expVendor = abbreviationExpand(v.name)
      if (expExtracted !== extractedName || expVendor !== v.name) {
        const expScore = stringSimilarity(expExtracted, expVendor)
        if (expScore > score) score = expScore
      }

      // 3. Phonetic matching bonus (Soundex)
      if (soundexMatch(extractedName, v.name)) {
        score = Math.min(1.0, score + 0.15)
      }

      return { id: v.id, name: v.name, score }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  // 0.55 threshold is preserved, but score calculations are more accurate
  const confident = best && best.score >= 0.55

  return {
    vendorId: confident ? best.id : null,
    vendorName: confident ? best.name : null,
    confidence: best ? Number(best.score.toFixed(4)) : 0,
    candidates: scored.slice(0, 5).map((c) => ({ ...c, score: Number(c.score.toFixed(4)) })),
  }
}

// --- Purchase order matching ----------------------------------------------

export interface PoCandidate {
  id: number
  poNumber: string
  vendorName: string
  totalAmount: number
}

// Extract a normalized PO token (digits/letters) from noisy text.
export function normalizePoNumber(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function matchPurchaseOrder(
  rawPoNumber: string | null,
  vendorName: string | null,
  totalAmount: number | null,
  candidates: PoCandidate[],
): PoMatchResult {
  if (candidates.length === 0) {
    return { poId: null, poNumber: null, confidence: 0, method: "none", candidates: [] }
  }

  // 1. Exact PO number match (after normalization).
  if (rawPoNumber) {
    const target = normalizePoNumber(rawPoNumber)
    const exact = candidates.find((c) => normalizePoNumber(c.poNumber) === target)
    if (exact) {
      return {
        poId: exact.id,
        poNumber: exact.poNumber,
        confidence: 1,
        method: "exact",
        candidates: [{ id: exact.id, poNumber: exact.poNumber, score: 1 }],
      }
    }
  }

  // 2. Fuzzy match across PO number + vendor + amount proximity.
  const scored = candidates
    .map((c) => {
      const poScore = rawPoNumber
        ? levenshteinSimilarity(normalizePoNumber(rawPoNumber), normalizePoNumber(c.poNumber))
        : 0
      const vendorScore = vendorName ? stringSimilarity(vendorName, c.vendorName) : 0
      const amountScore =
        totalAmount != null && c.totalAmount > 0
          ? Math.max(0, 1 - Math.abs(totalAmount - c.totalAmount) / c.totalAmount)
          : 0

      // We also check n-gram (trigram) similarity of the PO numbers for subsegment overlaps
      const poTrigramScore = rawPoNumber ? ngramSimilarity(rawPoNumber, c.poNumber, 3) : 0
      const combinedPoScore = 0.8 * poScore + 0.2 * poTrigramScore

      // Weighted blend, PO number dominates when present.
      const score = rawPoNumber
        ? 0.6 * combinedPoScore + 0.25 * vendorScore + 0.15 * amountScore
        : 0.6 * vendorScore + 0.4 * amountScore
      return { id: c.id, poNumber: c.poNumber, score: Number(score.toFixed(4)) }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  const confident = best && best.score >= 0.6

  return {
    poId: confident ? best.id : null,
    poNumber: confident ? best.poNumber : null,
    confidence: best ? best.score : 0,
    method: confident ? "fuzzy" : "none",
    candidates: scored.slice(0, 5),
  }
}

// --- Line item alignment ---------------------------------------------------

export interface PoItemCandidate {
  id: number
  description: string
  sku?: string | null
  quantity?: number
  unitPrice?: number
}

// Global score-sorted bipartite matching (avoids greedy first-come-first-serve order issues).
export function matchLineItems(
  invoiceItems: ExtractedLineItem[],
  poItems: PoItemCandidate[],
): LineItemMatch[] {
  // 1. Calculate matching scores for all possible pairs
  interface CandidateMatch {
    invIndex: number
    poItemId: number
    score: number
  }

  const allPairs: CandidateMatch[] = []

  invoiceItems.forEach((inv, invIndex) => {
    poItems.forEach((po) => {
      // 1.1 SKU Similarity (exact match = 1.0, fuzzy similarity score if close)
      let skuScore = 0
      if (inv.sku && po.sku) {
        const normInvSku = normalize(inv.sku)
        const normPoSku = normalize(po.sku)
        if (normInvSku === normPoSku) {
          skuScore = 1.0
        } else {
          // Fuzzy SKU similarity (Levenshtein)
          skuScore = levenshteinSimilarity(normInvSku, normPoSku) * 0.85
        }
      }

      // 1.2 Description Similarity
      const descScore = stringSimilarity(inv.description, po.description)

      // 1.3 Numeric Match Signal
      let numericBonus = 0
      if (po.unitPrice != null && inv.unitPrice === po.unitPrice) {
        numericBonus += 0.1 // Unit prices align
      }
      if (po.quantity != null && inv.quantity === po.quantity) {
        numericBonus += 0.05 // Quantities align
      }
      // If line totals align
      const invTotal = inv.lineTotal || inv.quantity * inv.unitPrice
      const poTotal = (po.quantity != null && po.unitPrice != null) ? po.quantity * po.unitPrice : 0
      if (poTotal > 0 && Math.abs(invTotal - poTotal) < 0.01) {
        numericBonus += 0.1
      }

      // Final match score calculation
      // SKU matches are highly preferred, followed by descriptive similarity
      const baseScore = Math.max(skuScore, descScore)
      const finalScore = Math.min(1.0, baseScore + numericBonus)

      allPairs.push({
        invIndex,
        poItemId: po.id,
        score: finalScore,
      })
    })
  })

  // 2. Sort all candidate matches by score descending
  allPairs.sort((a, b) => b.score - a.score)

  // 3. Select matches (stable matching / sorted edges greedy bipartite)
  const results: LineItemMatch[] = new Array(invoiceItems.length)
  for (let i = 0; i < invoiceItems.length; i++) {
    results[i] = { invoiceItemIndex: i, poItemId: null, score: 0 }
  }

  const matchedInvoiceIndexes = new Set<number>()
  const matchedPoItemIds = new Set<number>()

  for (const pair of allPairs) {
    if (matchedInvoiceIndexes.has(pair.invIndex) || matchedPoItemIds.has(pair.poItemId)) {
      continue
    }

    if (pair.score >= 0.5) {
      matchedInvoiceIndexes.add(pair.invIndex)
      matchedPoItemIds.add(pair.poItemId)
      results[pair.invIndex] = {
        invoiceItemIndex: pair.invIndex,
        poItemId: pair.poItemId,
        score: Number(pair.score.toFixed(4)),
      }
    }
  }

  // 4. Fill in remaining unmatched invoice items with their best unmatched PO item if score is tracked
  invoiceItems.forEach((_, index) => {
    if (!matchedInvoiceIndexes.has(index)) {
      // Find the highest score for this index, even if it wasn't selected (to represent match score context)
      const subPairs = allPairs.filter(p => p.invIndex === index)
      const maxScore = subPairs.length > 0 ? subPairs[0].score : 0
      results[index] = {
        invoiceItemIndex: index,
        poItemId: null,
        score: Number(maxScore.toFixed(4)),
      }
    }
  })

  return results
}
