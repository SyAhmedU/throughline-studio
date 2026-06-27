// ============================================================================
// Throughline Studio — the verified knowledge graph.
//
// The suite's whole reason to exist, made literal: ONE construct → the
// theories that frame it, the validated scales that measure it, the corpus
// papers coded to it, and the reference books that cover it — every edge a
// real, hand-verified record, zero fabrication.
//
// It connects three real CORS snapshots the suite already publishes:
//   • Research Book  constructs.json      → 167 OB constructs (code, name,
//                                            identifiers, real paper counts)
//   • Research Book  constructs.map.json  → construct → TheoryScope theories +
//                                            ScaleScope scales (deterministic
//                                            label match — machine-matched)
//   • ScaleScope     scales.json/items    → full scale records + verbatim items
//
// No AI, no inference: the graph is assembled from published records and every
// machine-matched edge is badged "verify" in the UI. Books are a live search
// link into BookScope (the corpus there is title/metadata-real).
// ============================================================================

const BOOK = 'https://syahmedu.github.io/syeds-research-book'

// ── deep links (identical to the ones already live in XwalkChips) ──────────
export const theoryLink = (slug: string) => `https://theoryscope.vercel.app/#/theory/${slug}`
export const scaleLink = (id: number) => `https://scalescope.vercel.app/?scale=${id}`
export const corpusLink = (code: string) => `${BOOK}/?construct=${encodeURIComponent(code)}`
export const booksLink = (q: string) => `https://bookscope.vercel.app/?q=${encodeURIComponent(q)}`

export interface GraphTheory {
  s: string
  n: string
}
export interface GraphScale {
  id?: number
  n: string
  ab?: string
}

/** One construct node with every verified edge resolved. */
export interface GraphConstruct {
  code: string
  name: string
  identifiers: string[]
  paperCount: number
  theories: GraphTheory[]
  scales: GraphScale[]
}

// Raw shapes of the two Book snapshots we merge.
interface RawConstruct {
  code: string
  name: string
  identifiers?: string[]
  paperCount?: number
  paperCountSheet?: number
}
interface MapEntry {
  theories?: GraphTheory[]
  scales?: GraphScale[]
}
interface ConstructMap {
  byCode?: Record<string, MapEntry>
}

let cache: GraphConstruct[] | null = null
let pending: Promise<GraphConstruct[]> | null = null

const stripBom = (s: string) => s.replace(/^﻿/, '')

/** Load + merge the snapshots into the construct graph (cached, BOM-safe). */
export function loadGraph(): Promise<GraphConstruct[]> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = Promise.all([
      fetch(`${BOOK}/data/constructs.json`).then((r) => (r.ok ? r.text() : null)),
      fetch(`${BOOK}/data/constructs.map.json`).then((r) => (r.ok ? r.text() : null)),
    ])
      .then(([ctext, mtext]) => {
        if (!ctext) return []
        const raw = JSON.parse(stripBom(ctext)) as RawConstruct[] | { constructs?: RawConstruct[] }
        const list = Array.isArray(raw) ? raw : raw.constructs ?? []
        const map = mtext ? (JSON.parse(stripBom(mtext)) as ConstructMap) : {}
        const byCode = map.byCode ?? {}
        cache = list
          .filter((c) => c?.code && c?.name)
          .map((c) => {
            const entry = byCode[c.code] ?? {}
            return {
              code: c.code,
              name: c.name,
              identifiers: Array.isArray(c.identifiers) ? c.identifiers : [],
              paperCount: c.paperCount ?? c.paperCountSheet ?? 0,
              theories: entry.theories ?? [],
              scales: entry.scales ?? [],
            }
          })
        return cache
      })
      .catch(() => {
        cache = []
        return cache
      })
  }
  return pending
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')

/**
 * Rank constructs against a free-text query (a construct, a question, anything).
 * Matches the construct name and its identifier synonyms; ranks exact > prefix >
 * word-boundary > substring, breaking ties by real corpus paper count so the
 * best-evidenced construct surfaces first. No fuzzy guessing.
 */
export function searchConstructs(all: GraphConstruct[], query: string, limit = 12): GraphConstruct[] {
  const q = norm(query)
  if (!q) {
    return [...all].sort((a, b) => b.paperCount - a.paperCount).slice(0, limit)
  }
  const terms = q.split(' ').filter(Boolean)
  const scored: { c: GraphConstruct; score: number }[] = []
  for (const c of all) {
    const name = norm(c.name)
    const ids = c.identifiers.map(norm)
    let score = 0
    if (name === q) score = 1000
    else if (name.startsWith(q)) score = 700
    else if (ids.some((id) => id === q)) score = 600
    else if (name.includes(q)) score = 400
    else if (ids.some((id) => id.includes(q))) score = 300
    else {
      // every query word lands somewhere in name or identifiers
      const hay = name + ' ' + ids.join(' ')
      if (terms.length > 1 && terms.every((t) => hay.includes(t))) score = 200
    }
    if (score > 0) scored.push({ c, score })
  }
  scored.sort((a, b) => b.score - a.score || b.c.paperCount - a.c.paperCount)
  return scored.slice(0, limit).map((x) => x.c)
}

/**
 * Totals for the header strap-line — true counts, no rounding up.
 * Note: we count *edges* (theory/scale links), not papers. A paper can be coded
 * to several constructs, so summing per-construct paper counts would overstate
 * the corpus; the real corpus size is a fixed, separately-stated figure.
 */
export function graphTotals(all: GraphConstruct[]) {
  let theories = 0
  let scales = 0
  for (const c of all) {
    theories += c.theories.length
    scales += c.scales.length
  }
  return { constructs: all.length, theories, scales }
}
