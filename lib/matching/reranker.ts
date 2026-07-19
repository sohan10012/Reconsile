// Cross-encoder re-ranking stage.
//
// In a production system this would call a hosted cross-encoder model
// (e.g. a sentence-transformers CrossEncoder) that jointly encodes the
// (query, candidate) pair and returns a relevance logit. Here we simulate
// that behavior deterministically so the pipeline is fully runnable without
// a dedicated model server, while keeping a swappable interface.
//
// Improvements in this surrogate:
// 1. Integrates character n-gram (trigram) similarity.
// 2. Adds prefix/suffix matching bonus.
// 3. Compares numeric tokens directly (important for PO numbers).
// 4. Clearly documented interface with RERANKER_MODE configuration.

import { stringSimilarity, tokenSetSimilarity } from "@/lib/matching"
import { ngramSimilarity, numericTokenSimilarity } from "@/lib/matching/similarity"

export type RerankerMode = 'deterministic' | 'api'

export const RERANKER_CONFIG = {
  mode: 'deterministic' as RerankerMode,
  apiEndpoint: process.env.RERANKER_API_ENDPOINT || null,
  apiKey: process.env.RERANKER_API_KEY || null,
}

export interface RerankCandidate {
  id: number
  text: string
  baseScore: number
}

export interface RerankedCandidate extends RerankCandidate {
  crossScore: number
  finalScore: number
}

/**
 * Deterministic cross-encoder surrogate.
 * Mimics how a cross-encoder model sharpens the scores around the true candidate
 * by performing joint query-candidate evaluations.
 */
export function crossEncoderRerank(
  query: string,
  candidates: RerankCandidate[],
): RerankedCandidate[] {
  if (RERANKER_CONFIG.mode === 'api' && RERANKER_CONFIG.apiEndpoint) {
    // Placeholder for actual API call if configured
    console.warn("External reranker API requested but not implemented. Falling back to deterministic surrogate.")
  }

  const qLower = query.toLowerCase().trim()

  return candidates
    .map((c) => {
      const tLower = c.text.toLowerCase().trim()

      // 1. Text similarities
      const joint = stringSimilarity(query, c.text)
      const overlap = tokenSetSimilarity(query, c.text)
      const trigram = ngramSimilarity(query, c.text, 3)

      // 2. Numeric segments comparison (vital for PO numbers)
      const numSim = numericTokenSimilarity(query, c.text)

      // 3. Prefix/suffix match bonus
      let prefixBonus = 0
      if (tLower.startsWith(qLower) || qLower.startsWith(tLower)) {
        prefixBonus = 0.15
      } else if (tLower.endsWith(qLower) || qLower.endsWith(tLower)) {
        prefixBonus = 0.08
      }

      // Compute surrogate cross-encoder score
      const crossScore = Number(
        (0.3 * joint + 0.2 * overlap + 0.2 * trigram + 0.2 * numSim + 0.1 * c.baseScore + prefixBonus).toFixed(4)
      )

      // Blend crossScore and base score
      // A high crossScore boosts confidence, but we also respect base retrieval score.
      const finalScore = Number(Math.min(1.0, 0.3 * c.baseScore + 0.7 * crossScore).toFixed(4))

      return { ...c, crossScore, finalScore }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
}
