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
