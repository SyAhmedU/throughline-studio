// ============================================================================
// Throughline Studio — "From your reading list" panel.
// One shared component: shows what the papers on this project's reading list
// actually used (theories, constructs, design, samples, measures, analyses,
// software, data), aggregated with true counts from the PRE-COMPUTED AI
// dissections (lib/paperFacets.ts — PaperCards shards + Research Book recent
// shards, re-verified verbatim on load). Each stage mounts it with the facet
// slice it cares about; an optional onUse turns chips into one-click actions
// (Frame → search the theory lens, Measure → search the scale catalogue).
//
// Honesty rules: counts are paper counts, never inflated; dashed chips failed
// the verbatim evidence check; coverage line states exactly how many papers
// have a stored dissection (it grows as the batch runs). Nothing is invented.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { readingList } from '../lib/corpus'
import {
  aggregateFacet,
  FACET_LABEL,
  loadReadingFacets,
  type AggItem,
  type FacetKey,
  type ReadingFacetsResult,
} from '../lib/paperFacets'
import type { Project } from '../lib/types'

const SHOW = 12 // chips per facet before "show all"

export function ReadingFacets({
  project,
  keys,
  lead,
  onUse,
  useTitle,
}: {
  project: Project
  keys: FacetKey[]
  lead: string
  /** turn chips of these facets into one-click actions (e.g. search the catalogue) */
  onUse?: Partial<Record<FacetKey, (text: string) => void>>
  /** tooltip for actionable chips, e.g. "Search the theory catalogue" */
  useTitle?: string
}) {
  const papers = readingList(project)
  const papersKey = papers.map((p) => p.id).join('|')
  const [res, setRes] = useState<ReadingFacetsResult | null>(null)
  const [open, setOpen] = useState<Partial<Record<FacetKey, boolean>>>({})

  useEffect(() => {
    let on = true
    setRes(null)
    if (!papers.length) return
    loadReadingFacets(papers).then((r) => {
      if (on) setRes(r)
    })
    return () => {
      on = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papersKey])

  const agg = useMemo(() => {
    if (!res) return null
    const out = new Map<FacetKey, AggItem[]>()
    for (const k of keys) out.set(k, aggregateFacet(papers, res.perPaper, k))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, papersKey, keys.join(',')])

  if (!papers.length) return null

  const anyItems = agg && [...agg.values()].some((list) => list.length > 0)

  return (
    <section className="bld-section rfx">
      <h2 className="bld-h">From your reading list</h2>
      <p className="bld-muted" style={{ marginTop: 0 }}>{lead}</p>

      {!res && <p className="bld-muted">Checking stored dissections…</p>}

      {res && !anyItems && (
        <p className="anz-fineprint">
          None of your {res.total} reading-list paper{res.total === 1 ? ' has' : 's have'} a stored dissection yet —
          the batch dissection is still filling. Check back later, or dissect a paper on demand in PaperCards.
        </p>
      )}

      {res && anyItems && (
        <>
          {keys.map((k) => {
            const items = agg!.get(k) || []
            if (!items.length) return null
            const visible = open[k] ? items : items.slice(0, SHOW)
            const act = onUse?.[k]
            return (
              <div key={k} className="rfx-facet">
                <span className="bld-label rfx-facet-label">{FACET_LABEL[k]}</span>
                <div className="rfx-chips">
                  {visible.map((it) => {
                    const title = [
                      it.detail || '',
                      `in ${it.count} paper${it.count === 1 ? '' : 's'}: ${it.papers.join(', ')}${it.count > it.papers.length ? '…' : ''}`,
                      it.verified ? '' : 'unverified — evidence snippet not found verbatim in the abstract',
                      act && useTitle ? `Click: ${useTitle}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    const cls = `rfx-chip${it.verified ? '' : ' rfx-unverified'}${act ? ' rfx-act' : ''}`
                    const body = (
                      <>
                        {it.text}
                        {it.count >= 2 && <span className="rfx-count">×{it.count}</span>}
                      </>
                    )
                    return act ? (
                      <button key={it.text} type="button" className={cls} title={title} onClick={() => act(it.text)}>
                        {body}
                      </button>
                    ) : (
                      <span key={it.text} className={cls} title={title}>
                        {body}
                      </span>
                    )
                  })}
                  {items.length > SHOW && (
                    <button
                      type="button"
                      className="rfx-chip rfx-more"
                      onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}
                    >
                      {open[k] ? 'show fewer' : `+${items.length - SHOW} more`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <p className="anz-fineprint" style={{ marginTop: 10 }}>
            AI-extracted from each paper's abstract (pre-computed dissections), evidence-checked verbatim — verify
            against the source before citing. ×N = how many of your papers carry it. Coverage: {res.covered} of{' '}
            {res.total} reading-list paper{res.total === 1 ? '' : 's'} dissected so far.
          </p>
        </>
      )}
    </section>
  )
}
