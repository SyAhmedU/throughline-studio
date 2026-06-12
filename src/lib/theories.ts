// ============================================================================
// Throughline Studio — Frame stage theory source.
// Streams TheoryScope's published catalogue (632 social-science theories, the
// same CORS JSON the suite hub grounds on). Real, hand-curated theories — the
// researcher attaches one as the study's lens. Nothing invented.
// ============================================================================

const URL = 'https://theoryscope.vercel.app/data/theories.json'

export interface Theory {
  slug: string
  name: string
  acronym?: string
  originators?: string
  year?: number
  discipline?: string
  level?: string
  oneLiner?: string
  constructs?: string[]
  keywords?: string[]
  keyStudy?: { authors?: string; year?: number; title?: string }
  researchflowStages?: string[]
}

let promise: Promise<Theory[]> | null = null
export function loadTheories(): Promise<Theory[]> {
  if (promise) return promise
  promise = (async () => {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`theories → HTTP ${res.status}`)
    const text = await res.text()
    const data = JSON.parse(text.replace(/^﻿/, '')) as { theories?: Theory[] }
    return Array.isArray(data.theories) ? data.theories : []
  })()
  return promise
}

export function searchTheories(all: Theory[], query: string): Theory[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return all
  return all.filter((t) => {
    const hay = (
      t.name +
      ' ' +
      (t.acronym || '') +
      ' ' +
      (t.oneLiner || '') +
      ' ' +
      (t.discipline || '') +
      ' ' +
      (t.constructs || []).join(' ') +
      ' ' +
      (t.keywords || []).join(' ')
    ).toLowerCase()
    return terms.every((term) => hay.includes(term))
  })
}

// ── Suggested theories — deterministic, no AI ───────────────────────────────
// Token-scores the study's own words (title, question, framed constructs)
// against the catalogue: construct hits count most, then name/acronym/keywords,
// then the one-liner. A match is a navigational hint to judge, never a verdict.

const STOP = new Set([
  'the', 'and', 'for', 'with', 'does', 'how', 'what', 'why', 'between', 'among',
  'effect', 'effects', 'impact', 'role', 'study', 'research', 'employee', 'employees',
  'organization', 'organizations', 'organizational', 'work', 'workplace', 'theory',
])

export function suggestTheories(all: Theory[], phrases: string[]): Theory[] {
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
    .map((t) => {
      const constructs = (t.constructs || []).join(' ').toLowerCase()
      const name = (t.name + ' ' + (t.acronym || '')).toLowerCase()
      const keywords = (t.keywords || []).join(' ').toLowerCase()
      const oneLiner = (t.oneLiner || '').toLowerCase()
      let score = 0
      for (const tok of tokens) {
        if (constructs.includes(tok)) score += 3
        else if (name.includes(tok)) score += 2
        else if (keywords.includes(tok)) score += 2
        else if (oneLiner.includes(tok)) score += 1
      }
      return { t, score }
    })
    .filter((x) => x.score >= 3) // one weak hit isn't a suggestion
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.t)
}

// ── Recent-corpus usage — real verbatim mention counts (2024→) ─────────────
// TheoryScope's corpus-usage.json: how many of the Research Book's ~79.5K
// recent papers literally name each theory (deterministic match, no AI).
// Navigational signal only — always presented as machine-matched.
const USAGE_URL = 'https://theoryscope.vercel.app/data/corpus-usage.json'

export interface TheoryUsage { n: number }
let usagePromise: Promise<Record<string, TheoryUsage>> | null = null
export function loadTheoryUsage(): Promise<Record<string, TheoryUsage>> {
  if (!usagePromise) {
    usagePromise = fetch(USAGE_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.usage ? (j.usage as Record<string, TheoryUsage>) : {}))
      .catch(() => ({}))
  }
  return usagePromise
}

export function theoryCitation(t: Theory): string {
  const k = t.keyStudy
  if (k?.authors) return `${k.authors} (${k.year ?? 'n.d.'}). ${k.title ?? ''}`.trim()
  if (t.originators) return `${t.originators} (${t.year ?? 'n.d.'}).`
  return ''
}

export const theoryLink = (slug: string): string =>
  `https://theoryscope.vercel.app/#/theory/${encodeURIComponent(slug)}`

/** Slim theory record attached to a project's Frame stage. */
export interface SavedTheory {
  slug: string
  name: string
  acronym?: string
  oneLiner?: string
  citation: string
}

export const toSavedTheory = (t: Theory): SavedTheory => ({
  slug: t.slug,
  name: t.name,
  acronym: t.acronym,
  oneLiner: t.oneLiner,
  citation: theoryCitation(t),
})
