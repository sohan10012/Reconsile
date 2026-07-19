// Extended string similarity utilities.
//
// This module supplements the core Levenshtein + token-set functions
// from lib/matching/index.ts with additional similarity metrics:
// - Character n-gram overlap (trigrams by default)
// - Phonetic matching via double metaphone surrogate
// - Common business abbreviation expansion

// ── Character n-gram similarity ────────────────────────────────────────────

function ngrams(s: string, n: number): Set<string> {
  const set = new Set<string>()
  const text = s.toLowerCase()
  for (let i = 0; i <= text.length - n; i++) {
    set.add(text.slice(i, i + n))
  }
  return set
}

/** Dice coefficient over character n-grams. */
export function ngramSimilarity(a: string, b: string, n = 3): number {
  if (!a || !b) return 0
  const ga = ngrams(a, n)
  const gb = ngrams(b, n)
  if (ga.size === 0 && gb.size === 0) return 1
  if (ga.size === 0 || gb.size === 0) return 0
  let overlap = 0
  for (const g of ga) if (gb.has(g)) overlap++
  return (2 * overlap) / (ga.size + gb.size)
}

// ── Phonetic matching (Soundex) ────────────────────────────────────────────

function soundex(s: string): string {
  const str = s.toUpperCase().replace(/[^A-Z]/g, '')
  if (str.length === 0) return ''

  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  }

  let code = str[0]
  let prev = map[str[0]] ?? '0'

  for (let i = 1; i < str.length && code.length < 4; i++) {
    const c = map[str[i]] ?? '0'
    if (c !== '0' && c !== prev) {
      code += c
    }
    prev = c
  }

  return (code + '0000').slice(0, 4)
}

/** True if two strings share the same Soundex code (phonetic similarity). */
export function soundexMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const wordsA = a.toLowerCase().split(/\s+/)
  const wordsB = b.toLowerCase().split(/\s+/)

  // Match if the majority of words share the same Soundex code.
  let matches = 0
  for (const wa of wordsA) {
    const sa = soundex(wa)
    if (sa && wordsB.some((wb) => soundex(wb) === sa)) {
      matches++
    }
  }

  return matches / Math.max(wordsA.length, 1) >= 0.5
}

// ── Abbreviation expansion ─────────────────────────────────────────────────

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bintl\b/gi, 'international'],
  [/\binc\b/gi, 'incorporated'],
  [/\bcorp\b/gi, 'corporation'],
  [/\bco\b/gi, 'company'],
  [/\bltd\b/gi, 'limited'],
  [/\bllc\b/gi, 'limited liability company'],
  [/\bmfg\b/gi, 'manufacturing'],
  [/\bdist\b/gi, 'distribution'],
  [/\bsvc\b/gi, 'service'],
  [/\bsvcs\b/gi, 'services'],
  [/\btech\b/gi, 'technology'],
  [/\bassoc\b/gi, 'associates'],
  [/\bgrp\b/gi, 'group'],
  [/\beng\b/gi, 'engineering'],
  [/\bmgmt\b/gi, 'management'],
  [/\bsys\b/gi, 'systems'],
  [/\bsol\b/gi, 'solutions'],
  [/\bnatl\b/gi, 'national'],
  [/\bamerican\b/gi, 'american'],
  [/\bamer\b/gi, 'american'],
]

/**
 * Expand common business abbreviations in a string.
 * Helps when OCR produces abbreviated vendor names that need to match
 * against fully-spelled database records.
 */
export function abbreviationExpand(input: string): string {
  let result = input
  for (const [re, expansion] of ABBREVIATIONS) {
    result = result.replace(re, expansion)
  }
  return result.trim()
}

// ── Numeric token extraction ────────────────────────────────────────────────

/** Extract all numeric tokens from a string (e.g. PO numbers often have numeric parts). */
export function numericTokens(s: string): string[] {
  return (s.match(/\d+/g) ?? [])
}

/** Similarity based on shared numeric subsequences. */
export function numericTokenSimilarity(a: string, b: string): number {
  const na = numericTokens(a)
  const nb = numericTokens(b)
  if (na.length === 0 && nb.length === 0) return 1
  if (na.length === 0 || nb.length === 0) return 0
  let matches = 0
  for (const t of na) if (nb.includes(t)) matches++
  return (2 * matches) / (na.length + nb.length)
}
