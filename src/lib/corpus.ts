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
  }
}

/** The reading list saved on a project's Discover stage. */
export function readingList(p: Project): SavedPaper[] {
  const data = p.stages.discover?.data as { papers?: SavedPaper[] } | undefined
  return Array.isArray(data?.papers) ? data!.papers! : []
}
