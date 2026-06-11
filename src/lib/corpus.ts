// ============================================================================
// Throughline Studio — Discover stage data source.
// Streams Syed's Research Book corpus (9,388 hand-coded papers across 167
// OB/management constructs) as a searchable source. Same published static JSON
// the Research Book and PaperCards read (GitHub Pages serves
// Access-Control-Allow-Origin: *) — one source of truth, nothing drifts.
//
// We never persist the whole corpus (it would blow localStorage); only the
// papers the researcher *picks* are saved into the project's reading list,
// each carrying Syed's REAL hand-coded constructs. No fabrication.
// ============================================================================

import type { Project } from './types'

const BASE = 'https://syahmedu.github.io/syeds-research-book/data'

/** One record from papers.index.json (only the fields we use). */
export interface CorpusPaper {
  id: string
  doi: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  citations?: number
  scopusPercentile?: number
  openAccess?: boolean
  oaUrl?: string | null
  constructCodes: string[]
  hasAbstract: boolean
  /** true = OpenAlex refresh tier (machine-tagged to the same 167 constructs,
   *  NOT hand-coded — always badged, never silently mixed) */
  recent?: boolean
}

export interface ConstructInfo {
  code: string
  name: string
  paperCount: number
}

export interface Corpus {
  papers: CorpusPaper[]
  constructs: ConstructInfo[] // 167, for the filter dropdown
  codeToName: Map<string, string> // construct code → display name (Syed's coding)
}

// The Research Book pipeline writes JSON with a leading UTF-8 BOM (a
// pipeline-wide convention). Response.json() strips it; we parse text and strip
// defensively in case anything in between doesn't.
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  const text = await res.text()
  return JSON.parse(text.replace(/^﻿/, '')) as T
}

let corpusPromise: Promise<Corpus> | null = null
export function loadCorpus(): Promise<Corpus> {
  if (corpusPromise) return corpusPromise
  corpusPromise = (async () => {
    const [papers, constructsRaw] = await Promise.all([
      fetchJson<CorpusPaper[]>(`${BASE}/papers.index.json`),
      fetchJson<{ code: string; name: string; paperCount?: number }[]>(`${BASE}/constructs.json`),
    ])
    const codeToName = new Map<string, string>()
    const constructs: ConstructInfo[] = []
    for (const c of constructsRaw) {
      codeToName.set(c.code, c.name)
      constructs.push({ code: c.code, name: c.name, paperCount: c.paperCount ?? 0 })
    }
    constructs.sort((a, b) => a.name.localeCompare(b.name))
    return { papers, constructs, codeToName }
  })()
  return corpusPromise
}

export interface CorpusFilters {
  query: string
  constructCode: string // '' = any
  oaOnly: boolean
  sort: 'percentile' | 'year-desc' | 'citations'
}

export function searchCorpus(corpus: Corpus, f: CorpusFilters): CorpusPaper[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const out = corpus.papers.filter((p) => {
    if (f.constructCode && !p.constructCodes.includes(f.constructCode)) return false
    if (f.oaOnly && !p.openAccess) return false
    if (terms.length) {
      const hay = (p.title + ' ' + (p.authors || []).join(' ') + ' ' + (p.journal || '')).toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
  out.sort((a, b) => {
    switch (f.sort) {
      case 'year-desc':
        return (b.year ?? 0) - (a.year ?? 0)
      case 'citations':
        return (b.citations ?? 0) - (a.citations ?? 0)
      default:
        return (b.scopusPercentile ?? 0) - (a.scopusPercentile ?? 0)
    }
  })
  return out
}

// Abstracts live in a separate file — fetched once, lazily, cached the first
// time a paper's text is expanded.
let abstractsPromise: Promise<Record<string, string>> | null = null
export function getAbstract(id: string): Promise<string> {
  if (!abstractsPromise) {
    abstractsPromise = fetchJson<Record<string, string>>(`${BASE}/abstracts.json`).catch(() => ({}))
  }
  return abstractsPromise.then((a) => a[id] || '')
}

// ── ↑ Recent tier — the Research Book's OpenAlex refresh pull ───────────────
// data/recent.index.json: real 2024→ papers fetched per construct/journal,
// DOI-deduped against the hand-coded moat, machine-tagged to the same 167
// construct codes. It is ~42 MB, so it loads only on an explicit one-click
// opt-in (remembered per browser) — never silently, never blocking the
// hand-coded corpus.

let recentPromise: Promise<CorpusPaper[]> | null = null
export function loadRecent(): Promise<CorpusPaper[]> {
  if (recentPromise) return recentPromise
  recentPromise = (async () => {
    const raw = await fetchJson<CorpusPaper[]>(`${BASE}/recent.index.json`)
    return raw.map((p) => ({ ...p, recent: true as const }))
  })()
  recentPromise.catch(() => {
    recentPromise = null // don't cache a failed ~42 MB fetch — let the user retry
  })
  return recentPromise
}

// Recent-tier abstracts are sharded by DOI hash (data/recent.abstracts/<NN>.json);
// the hash MUST match the Research Book's recentShardOf (merge-refresh.mjs).
const RECENT_ABS_SHARDS = 16
function recentShardOf(doi: string): string {
  let h = 0
  for (let i = 0; i < doi.length; i++) h = (h * 31 + doi.charCodeAt(i)) >>> 0
  return String(h % RECENT_ABS_SHARDS).padStart(2, '0')
}
const recentAbsCache: Record<string, Promise<Record<string, string>>> = {}
export function getRecentAbstract(doi: string): Promise<string> {
  const sh = recentShardOf(doi)
  if (!recentAbsCache[sh]) {
    recentAbsCache[sh] = fetchJson<Record<string, string>>(`${BASE}/recent.abstracts/${sh}.json`).catch(() => ({}))
  }
  return recentAbsCache[sh].then((m) => m[doi] || '')
}

// ── ⚡ Live layer — this month's papers, straight from OpenAlex ─────────────
// Mirrors the Research Book's live tier: when the researcher asks for it, pull
// the newest works (last ~60 days) matching the query from the OpenAlex API.
// Real records only, badged "live · verify" in the UI — machine-matched, not
// hand-coded, so they are never mixed silently into the corpus results.

export interface LivePaper extends CorpusPaper {
  live: true
  abstractText?: string
}

function invertAbstract(inv?: Record<string, number[]>): string | undefined {
  if (!inv) return undefined
  const words: string[] = []
  for (const [w, idxs] of Object.entries(inv)) for (const i of idxs) words[i] = w
  return words.join(' ')
}

export async function searchLive(query: string, signal?: AbortSignal): Promise<LivePaper[]> {
  const from = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10)
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
    `&filter=from_publication_date:${from}&sort=publication_date:desc&per-page=10`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`OpenAlex → HTTP ${res.status}`)
  const json = (await res.json()) as {
    results?: Array<{
      id: string
      doi?: string | null
      display_name?: string
      publication_year?: number
      cited_by_count?: number
      authorships?: Array<{ author?: { display_name?: string } }>
      primary_location?: { source?: { display_name?: string } }
      open_access?: { is_oa?: boolean; oa_url?: string | null }
      abstract_inverted_index?: Record<string, number[]>
    }>
  }
  return (json.results || [])
    .filter((w) => w.display_name)
    .map((w) => ({
      live: true as const,
      id: w.id,
      doi: (w.doi || '').replace(/^https?:\/\/doi\.org\//, ''),
      title: w.display_name!,
      authors: (w.authorships || []).slice(0, 12).map((a) => a.author?.display_name).filter((x): x is string => !!x),
      year: w.publication_year,
      journal: w.primary_location?.source?.display_name,
      citations: w.cited_by_count,
      openAccess: w.open_access?.is_oa,
      oaUrl: w.open_access?.oa_url ?? null,
      constructCodes: [],
      hasAbstract: false,
      abstractText: invertAbstract(w.abstract_inverted_index),
    }))
}

// ── Reading list (what the Discover stage carries forward) ─────────────────
// A slim, persisted subset of a corpus paper. Constructs are stored as resolved
// names (Syed's hand-coding) so the rest of the workflow reads human labels.

export interface SavedPaper {
  id: string
  doi?: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  constructs: string[]
  scopusPercentile?: number
  openAccess?: boolean
  oaUrl?: string | null
  addedAt: number
  /** true when the record came from the live OpenAlex layer (verify before citing) */
  live?: boolean
  /** true when the record came from the ↑ recent tier (machine-tagged, verify before citing) */
  recent?: boolean
}

export function toSaved(cp: CorpusPaper, codeToName: Map<string, string>): SavedPaper {
  return {
    id: cp.doi || cp.id,
    doi: cp.doi || undefined,
    title: cp.title,
    authors: cp.authors,
    year: cp.year,
    journal: cp.journal,
    constructs: cp.constructCodes.map((c) => codeToName.get(c) || c),
    scopusPercentile: cp.scopusPercentile,
    openAccess: cp.openAccess,
    oaUrl: cp.oaUrl,
    addedAt: Date.now(),
    live: (cp as LivePaper).live || undefined,
    recent: cp.recent || undefined,
  }
}

// ── Citation exports (real records only) ────────────────────────────────────
// BibTeX/RIS built verbatim from saved reading-list records. Papers without
// structured fields stay out (the plain-text references draft still lists them).

function bibKey(p: SavedPaper): string {
  const last = ((p.authors?.[0] || 'anon').split(/\s+/).pop() || 'anon').replace(/[^A-Za-z]/g, '').toLowerCase()
  const word = (p.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).find((w) => w.length > 3) || 'paper'
  return `${last}${p.year || ''}${word}`
}

export function toBibtex(papers: SavedPaper[]): string {
  return papers
    .map((p) => {
      const f: string[] = [`  title = {${p.title}}`]
      if (p.authors?.length) f.push(`  author = {${p.authors.join(' and ')}}`)
      if (p.year) f.push(`  year = {${p.year}}`)
      if (p.journal) f.push(`  journal = {${p.journal}}`)
      if (p.doi) f.push(`  doi = {${p.doi}}`)
      return `@article{${bibKey(p)},\n${f.join(',\n')}\n}`
    })
    .join('\n\n')
}

export function toRis(papers: SavedPaper[]): string {
  return papers
    .map((p) => {
      const lines = ['TY  - JOUR', `TI  - ${p.title}`]
      for (const a of p.authors || []) lines.push(`AU  - ${a}`)
      if (p.year) lines.push(`PY  - ${p.year}`)
      if (p.journal) lines.push(`JO  - ${p.journal}`)
      if (p.doi) lines.push(`DO  - ${p.doi}`)
      lines.push('ER  - ')
      return lines.join('\n')
    })
    .join('\n')
}

/** The reading list saved on a project's Discover stage. */
export function readingList(p: Project): SavedPaper[] {
  const data = p.stages.discover?.data as { papers?: SavedPaper[] } | undefined
  return Array.isArray(data?.papers) ? data!.papers! : []
}
