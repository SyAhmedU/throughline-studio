// ============================================================================
// Throughline Studio — Publish stage journal source.
// Streams the suite's hand-maintained journal catalogue (1,959 Scopus journals
// — JournalTime's data.js, published as a CORS JSON snapshot). Every metric is
// verbatim from the catalogue; `source: 'estimated'` turnarounds were never
// measured and are badged as such. Suggestions are a deterministic token match
// on the study's own words — a starting shortlist, never a verdict.
// ============================================================================

const URL = 'https://syahmedu.github.io/journaltime/data/journals.json'

export interface Journal {
  id: number
  name: string
  publisher?: string
  field?: string
  quartile?: string
  impactFactor?: number
  openAccess?: boolean
  firstDecisionDays?: number
  timeToAcceptanceDays?: number
  acceptanceRate?: number
  source?: string // 'publisher' | 'estimated'
  keywords?: string[]
  themes?: string[]
}

let promise: Promise<Journal[]> | null = null
export function loadJournals(): Promise<Journal[]> {
  if (promise) return promise
  promise = (async () => {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`journals → HTTP ${res.status}`)
    const text = await res.text()
    const data = JSON.parse(text.replace(/^﻿/, '')) as { journals?: Journal[] }
    return Array.isArray(data.journals) ? data.journals : []
  })()
  promise.catch(() => {
    promise = null
  })
  return promise
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'does', 'how', 'what', 'why', 'between', 'among', 'across',
  'effect', 'effects', 'impact', 'role', 'study', 'research', 'journal', 'review', 'daily',
  'international', 'european', 'american', 'quarterly', 'annual',
])

const QUARTILE_RANK: Record<string, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 }

export function suggestJournals(all: Journal[], phrases: string[]): Journal[] {
  const tokens = [...new Set(
    phrases
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/[\s-]+/)
      .filter((t) => t.length >= 4 && !STOP.has(t)),
  )]
  if (!tokens.length) return []
  return all
    .map((j) => {
      const name = j.name.toLowerCase()
      const keywords = (j.keywords || []).join(' ').toLowerCase()
      const themes = (j.themes || []).join(' ').toLowerCase()
      const field = (j.field || '').toLowerCase()
      let score = 0
      for (const tok of tokens) {
        if (name.includes(tok)) score += 3
        else if (keywords.includes(tok)) score += 3
        else if (themes.includes(tok)) score += 2
        else if (field.includes(tok)) score += 1
      }
      return { j, score }
    })
    .filter((x) => x.score >= 3) // a lone field hit isn't a suggestion
    .sort(
      (a, b) =>
        b.score - a.score ||
        (QUARTILE_RANK[b.j.quartile || ''] || 0) - (QUARTILE_RANK[a.j.quartile || ''] || 0) ||
        (b.j.impactFactor || 0) - (a.j.impactFactor || 0),
    )
    .slice(0, 6)
    .map((x) => x.j)
}
