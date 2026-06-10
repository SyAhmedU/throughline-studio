// ============================================================================
// Throughline Studio — Measure stage instrument source.
// Streams ScaleScope's published catalogue (332 validated measurement scales,
// the same CORS JSON the suite hub grounds on). Real reliability, dimensions,
// and citations — the researcher composes an instrument from real scales.
// Verbatim item wording comes from a second lazy snapshot (scale-items.json,
// 178 scales with reproducible items); the rest deep-link to ScaleScope.
// ============================================================================

const URL = 'https://scalescope.vercel.app/data/scales.json'
const ITEMS_URL = 'https://scalescope.vercel.app/data/scale-items.json'

export interface ScaleDim {
  name: string
  items: number
  alpha?: number
}

export interface Scale {
  id: number
  name: string
  abbreviation?: string
  construct?: string
  domain?: string
  subdomain?: string
  dimensions?: ScaleDim[]
  itemCount?: number
  responseFormat?: string
  reliability?: { cronbach_alpha?: string; notes?: string }
  tags?: string[]
  notes?: string
  citation?: { authors?: string; year?: number; title?: string }
}

let promise: Promise<Scale[]> | null = null
export function loadScales(): Promise<Scale[]> {
  if (promise) return promise
  promise = (async () => {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`scales → HTTP ${res.status}`)
    const text = await res.text()
    const data = JSON.parse(text.replace(/^﻿/, '')) as { scales?: Scale[] }
    return Array.isArray(data.scales) ? data.scales : []
  })()
  return promise
}

export function searchScales(all: Scale[], query: string, domain: string): Scale[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return all.filter((s) => {
    if (domain && s.domain !== domain) return false
    if (!terms.length) return true
    const hay = (
      s.name +
      ' ' +
      (s.abbreviation || '') +
      ' ' +
      (s.construct || '') +
      ' ' +
      (s.domain || '') +
      ' ' +
      (s.tags || []).join(' ')
    ).toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

export interface ScaleItem {
  num: number
  text: string
  dimension?: string
  reversed?: boolean
}

export interface ScaleItemSet {
  anchors?: string
  items: ScaleItem[]
}

/** id → verbatim item wording, for the scales that publish it (~178 of 332). */
export type ScaleItemsMap = Record<number, ScaleItemSet>

let itemsPromise: Promise<ScaleItemsMap> | null = null
export function loadScaleItems(): Promise<ScaleItemsMap> {
  if (itemsPromise) return itemsPromise
  itemsPromise = (async () => {
    try {
      const res = await fetch(ITEMS_URL)
      if (!res.ok) return {}
      const text = await res.text()
      const data = JSON.parse(text.replace(/^﻿/, '')) as { items?: ScaleItemsMap }
      return data.items && typeof data.items === 'object' ? data.items : {}
    } catch {
      return {} // graceful: cards fall back to the ScaleScope deep link
    }
  })()
  return itemsPromise
}

export function domainsOf(all: Scale[]): string[] {
  const set = new Set<string>()
  for (const s of all) if (s.domain) set.add(s.domain)
  return [...set].sort()
}

export function scaleCitation(s: Scale): string {
  const c = s.citation
  return c?.authors ? `${c.authors} (${c.year ?? 'n.d.'}). ${c.title ?? ''}`.trim() : ''
}

export const scaleLink = (id: number): string => `https://scalescope.vercel.app/#scale=${id}`

/** Slim scale record added to a project's instrument (Measure stage). */
export interface SavedScale {
  id: number
  name: string
  abbreviation?: string
  construct?: string
  itemCount?: number
  responseFormat?: string
  alphaSummary?: string
  citation: string
}

export const toSavedScale = (s: Scale): SavedScale => ({
  id: s.id,
  name: s.name,
  abbreviation: s.abbreviation,
  construct: s.construct,
  itemCount: s.itemCount,
  responseFormat: s.responseFormat,
  alphaSummary: s.reliability?.cronbach_alpha,
  citation: scaleCitation(s),
})
