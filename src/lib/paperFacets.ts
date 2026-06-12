// ============================================================================
// Throughline Studio — reading-list paper facets.
// Pulls the PRE-COMPUTED AI dissections for the papers on a project's reading
// list and aggregates what those papers used: theories, constructs, design,
// sample, measures, analysis, software, data. Stages surface the slice they
// care about (Frame = theory+constructs, Measure = measures, Collect =
// sample+data, Analyze = analysis+software).
//
// Sources (read-only, both CORS-open):
//   • hand-coded corpus tier → papercards.vercel.app/data/dissections/<NN>.json
//     (64 DOI-hash shards, written by paperpulse scripts/dissect-corpus.mjs)
//   • latest-fetched tier → Research Book data/recent.dissections/<NNN>.json
//     (256 shards, same script with --tier recent)
//
// NO-FABRICATION: stored output is re-verified here against the paper's own
// abstract with the SAME guard PaperCards uses (normalised evidence-snippet
// match + verbatim-number check) — a faithful port of paperpulse
// src/lib/guards.ts + dissect.ts normaliseFacets. Items whose evidence can't
// be matched are flagged unverified (shown dashed). Papers without a stored
// dissection contribute nothing — coverage is reported truthfully and grows
// as the batch dissection runs.
// ============================================================================

import { getAbstract, getRecentAbstract, type SavedPaper } from './corpus'

// The facet keys we surface in Studio (the shards may carry more — e.g.
// hypotheses/findings — those stay in PaperCards' deeper views).
export type FacetKey =
  | 'theory'
  | 'constructs'
  | 'design'
  | 'sample'
  | 'measures'
  | 'analysis'
  | 'software'
  | 'data'

export const FACET_LABEL: Record<FacetKey, string> = {
  theory: 'Theories used',
  constructs: 'Constructs',
  design: 'Design / method',
  sample: 'Samples',
  measures: 'Measures',
  analysis: 'Analyses',
  software: 'Software / tools',
  data: 'Data',
}

export interface FacetItem {
  text: string
  detail?: string
  evidence?: string
  verified?: boolean
}

export type PaperFacets = Partial<Record<FacetKey, FacetItem[]>>

// ── Verbatim guard — faithful port of paperpulse guards.ts ─────────────────
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function evidenceFound(snippet: string, normText: string): boolean {
  const n = norm(snippet)
  if (n.length < 6) return false
  const words = n.split(' ')
  const probe = words.slice(0, Math.min(8, words.length)).join(' ')
  if (probe.length < 6) return false
  return normText.includes(probe)
}

function numAppears(value: number, hay: string): boolean {
  if (!Number.isFinite(value)) return false
  const a = Math.abs(value)
  const cands = new Set<string>()
  const push = (s: string) => {
    if (!s) return
    cands.add(s)
    if (s.startsWith('0.')) cands.add(s.slice(1))
    if (s.includes('.')) {
      const t = s.replace(/0+$/, '').replace(/\.$/, '')
      cands.add(t)
      if (t.startsWith('0.')) cands.add(t.slice(1))
    }
  }
  push(String(a))
  if (Number.isInteger(a)) {
    push(String(a))
    push(a.toLocaleString('en-US'))
  } else {
    push(a.toFixed(1))
    push(a.toFixed(2))
    push(a.toFixed(3))
  }
  for (const c of cands) if (c.length >= 2 && hay.includes(c)) return true
  return false
}

function guardNumbersInDetail(detail: string, text: string): string {
  return detail.replace(/-?\d[\d,]*\.?\d*/g, (m) => {
    const v = parseFloat(m.replace(/,/g, ''))
    return numAppears(v, text) ? m : '—'
  })
}

const SURFACED: FacetKey[] = ['theory', 'constructs', 'design', 'sample', 'measures', 'analysis', 'software', 'data']

// Mirror of paperpulse dissect.ts normaliseFacets, restricted to the surfaced
// keys: dedupe per facet, verify each evidence snippet against the abstract,
// strip unverifiable numbers from details. Returns null when nothing survives.
function normaliseStored(raw: unknown, abstract: string): PaperFacets | null {
  const facets = (raw as { facets?: Record<string, unknown> } | null)?.facets
  if (!facets || typeof facets !== 'object') return null
  const normText = norm(abstract)
  const out: PaperFacets = {}
  let total = 0
  for (const key of SURFACED) {
    const items = (facets as Record<string, unknown>)[key]
    if (!Array.isArray(items)) continue
    const seen = new Set<string>()
    const list: FacetItem[] = []
    for (const it of items as Array<Record<string, unknown>>) {
      const text = (it?.text ?? '').toString().trim()
      if (!text) continue
      const dedupe = text.toLowerCase()
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      const evidence = (it?.evidence ?? '').toString().trim().slice(0, 300) || undefined
      const verified = evidence ? evidenceFound(evidence, normText) : false
      const detailRaw = (it?.detail ?? '').toString().trim()
      const detail = detailRaw ? guardNumbersInDetail(detailRaw, abstract).slice(0, 280) : undefined
      list.push({ text: text.slice(0, 240), detail, evidence, verified })
      total++
    }
    if (list.length) out[key] = list
  }
  return total > 0 ? out : null
}

// ── Shard access (both tiers) ───────────────────────────────────────────────
const HAND_BASE = 'https://papercards.vercel.app/data/dissections'
const RECENT_BASE = 'https://syahmedu.github.io/syeds-research-book/data/recent.dissections'

// MUST match shardOf() in paperpulse scripts/dissect-corpus.mjs.
function hashOf(doi: string): number {
  let h = 0
  for (let i = 0; i < doi.length; i++) h = (h * 31 + doi.charCodeAt(i)) >>> 0
  return h
}
const handShardOf = (doi: string) => String(hashOf(doi) % 64).padStart(2, '0')
const recentShardOf = (doi: string) => String(hashOf(doi) % 256).padStart(3, '0')

interface StoredRecord {
  dissection: unknown
}
const shardCache = new Map<string, Promise<Record<string, StoredRecord>>>()
function loadShard(url: string): Promise<Record<string, StoredRecord>> {
  let p = shardCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
    shardCache.set(url, p)
  }
  return p
}

async function storedFor(doi: string, recent: boolean): Promise<unknown | null> {
  for (const key of [...new Set([doi, doi.toLowerCase()])]) {
    const url = recent ? `${RECENT_BASE}/${recentShardOf(key)}.json` : `${HAND_BASE}/${handShardOf(key)}.json`
    const shard = await loadShard(url)
    const d = shard[key]?.dissection
    if (d) return d
  }
  return null
}

// ── Per-paper + reading-list-level loading ──────────────────────────────────
const paperCache = new Map<string, Promise<PaperFacets | null>>()

/** Stored, guard-verified facets for one reading-list paper (null = none on file). */
export function paperFacets(p: SavedPaper): Promise<PaperFacets | null> {
  const doi = p.doi || p.id
  if (!doi || p.live) return Promise.resolve(null) // live layer has no stored dissections
  const cacheKey = `${p.recent ? 'r' : 'h'}:${doi}`
  let job = paperCache.get(cacheKey)
  if (!job) {
    job = (async () => {
      const stored = await storedFor(doi, !!p.recent)
      if (!stored) return null
      const abstract = p.recent ? await getRecentAbstract(doi) : await getAbstract(p.id)
      if (!abstract) return null
      return normaliseStored(stored, abstract)
    })().catch(() => null)
    paperCache.set(cacheKey, job)
  }
  return job
}

export interface ReadingFacetsResult {
  perPaper: Map<string, PaperFacets> // SavedPaper.id → facets
  covered: number // papers with a stored dissection
  total: number // papers checked (live-layer papers excluded)
}

export async function loadReadingFacets(papers: SavedPaper[]): Promise<ReadingFacetsResult> {
  const eligible = papers.filter((p) => !p.live)
  const results = await Promise.all(eligible.map((p) => paperFacets(p)))
  const perPaper = new Map<string, PaperFacets>()
  results.forEach((f, i) => {
    if (f) perPaper.set(eligible[i].id, f)
  })
  return { perPaper, covered: perPaper.size, total: eligible.length }
}

// ── Aggregation — what the reading list uses, with true counts ─────────────
export interface AggItem {
  text: string // representative casing (first seen)
  detail?: string
  count: number // number of reading-list papers carrying this item
  verified: boolean // true when at least one occurrence passed the verbatim guard
  papers: string[] // short labels ("Bakker 2008") for the tooltip
}

function shortLabel(p: SavedPaper): string {
  const last = (p.authors?.[0] || '').split(/[\s,]+/).filter(Boolean).pop() || '—'
  return p.year ? `${last} ${p.year}` : last
}

export function aggregateFacet(papers: SavedPaper[], perPaper: Map<string, PaperFacets>, key: FacetKey): AggItem[] {
  const byNorm = new Map<string, AggItem>()
  for (const p of papers) {
    const items = perPaper.get(p.id)?.[key]
    if (!items) continue
    const seen = new Set<string>()
    for (const it of items) {
      const k = norm(it.text)
      if (!k || seen.has(k)) continue
      seen.add(k)
      const agg = byNorm.get(k)
      if (agg) {
        agg.count++
        agg.verified = agg.verified || !!it.verified
        if (!agg.detail && it.detail) agg.detail = it.detail
        if (agg.papers.length < 8) agg.papers.push(shortLabel(p))
      } else {
        byNorm.set(k, {
          text: it.text,
          detail: it.detail,
          count: 1,
          verified: !!it.verified,
          papers: [shortLabel(p)],
        })
      }
    }
  }
  return [...byNorm.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
}
