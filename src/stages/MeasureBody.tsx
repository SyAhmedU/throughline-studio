// ============================================================================
// Throughline Studio — Measure stage workspace.
// Compose a survey instrument from ScaleScope's 332 validated scales (real
// reliability, dimensions, citations). Add scales to the project's instrument;
// it persists and carries to Collect. Verbatim item wording is shown inline
// for the 178 scales that publish it (lazy scale-items.json); the rest
// deep-link to ScaleScope.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  domainsOf,
  loadScaleItems,
  loadScales,
  scaleLink,
  searchScales,
  toSavedScale,
  type SavedScale,
  type Scale,
  type ScaleItemsMap,
} from '../lib/scales'
import { deepLink, stageDef } from '../lib/stages'
import { setStageData } from '../lib/store'
import type { Project } from '../lib/types'

const PAGE = 20

function instrumentOf(p: Project): SavedScale[] {
  const d = p.stages.measure?.data as { scales?: SavedScale[] } | undefined
  return Array.isArray(d?.scales) ? d!.scales! : []
}

// ── Suggested scales — deterministic, no AI ─────────────────────────────────
// Reads the constructs the researcher framed (IV/DV/mediators/moderators) and
// token-scores them against the catalogue. searchScales is every-term-AND
// (too strict for multi-word construct phrases), so this is a weighted scorer:
// construct-field hits count most, then name/abbreviation, then tags. A match
// is a navigational hint, never a verdict — the card says so.

const STOP = new Set(['the', 'and', 'for', 'with', 'employee', 'team', 'work', 'level', 'perceived'])

/** "psychological safety, engagement & burnout" → ['psychological safety', 'engagement', 'burnout'] */
export function framedConstructs(frame: { iv?: string; dv?: string; mediators?: string; moderators?: string }): string[] {
  const out: string[] = []
  for (const raw of [frame.iv, frame.dv, frame.mediators, frame.moderators]) {
    for (const part of (raw || '').split(/,|;|&|\band\b|\//i)) {
      const c = part.trim().replace(/\s+/g, ' ')
      if (c.length >= 3 && !out.some((x) => x.toLowerCase() === c.toLowerCase())) out.push(c)
    }
  }
  return out
}

function tokensOf(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
}

function scoreScale(s: Scale, tokens: string[]): number {
  if (!tokens.length) return 0
  const construct = (s.construct || '').toLowerCase()
  const name = s.name.toLowerCase()
  const abbr = (s.abbreviation || '').toLowerCase()
  const tags = (s.tags || []).join(' ').toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (construct.includes(t)) score += 3
    else if (name.includes(t) || abbr === t) score += 2
    else if (tags.includes(t)) score += 1
  }
  return score
}

export function suggestScales(all: Scale[], constructs: string[]): { construct: string; scales: Scale[] }[] {
  const out: { construct: string; scales: Scale[] }[] = []
  for (const c of constructs) {
    const tokens = tokensOf(c)
    if (!tokens.length) continue
    const scored = all
      .map((s) => ({ s, score: scoreScale(s, tokens) }))
      .filter((x) => x.score >= 2) // a lone tag hit isn't a suggestion
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.s)
    if (scored.length) out.push({ construct: c, scales: scored })
  }
  return out
}

/** Verbatim item wording for one scale (real text from ScaleScope's catalogue). */
function ItemList({ set }: { set: NonNullable<ScaleItemsMap[number]> }) {
  return (
    <div className="ms-items">
      {set.anchors && <p className="ms-items-anchors">{set.anchors}</p>}
      <ol className="ms-items-list">
        {set.items.map((it) => (
          <li key={it.num} value={it.num}>
            {it.text}
            {it.reversed && <span className="ms-item-rev" title="Reverse-scored"> (R)</span>}
            {it.dimension && <span className="disc-dim"> — {it.dimension}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function MeasureBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [all, setAll] = useState<Scale[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [itemsMap, setItemsMap] = useState<ScaleItemsMap>({})
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    let alive = true
    loadScales()
      .then((s) => alive && (setAll(s), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    loadScaleItems().then((m) => alive && setItemsMap(m))
    return () => {
      alive = false
    }
  }, [])

  function toggleItems(id: number) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  useEffect(() => setLimit(PAGE), [query, domain])

  const results = useMemo(() => (all ? searchScales(all, query, domain) : []), [all, query, domain])
  const frame = (project.stages.frame?.data || {}) as { iv?: string; dv?: string; mediators?: string; moderators?: string }
  const suggestions = useMemo(
    () => (all ? suggestScales(all, framedConstructs(frame)) : []),
    [all, frame.iv, frame.dv, frame.mediators, frame.moderators],
  )
  const instr = instrumentOf(project)
  const inSet = useMemo(() => new Set(instr.map((s) => s.id)), [instr])
  const totalItems = instr.reduce((a, s) => a + (s.itemCount || 0), 0)

  function save(next: SavedScale[]) {
    onChange(setStageData(project, 'measure', { ...(project.stages.measure.data || {}), scales: next }))
  }
  function toggle(sc: Scale) {
    save(inSet.has(sc.id) ? instr.filter((s) => s.id !== sc.id) : [toSavedScale(sc), ...instr])
  }

  const tools = stageDef('measure').tools

  if (status === 'loading') {
    return (
      <div className="disc-state">
        <span className="spinner" aria-hidden="true" />
        <p>Loading 332 validated scales from ScaleScope…</p>
      </div>
    )
  }

  return (
    <div className="ms">
      {/* the instrument */}
      <div className="ms-instrument">
        <div className="ms-instr-top">
          <h2 className="bld-h" style={{ margin: 0 }}>Your instrument</h2>
          <span className="ms-instr-count">
            {instr.length} {instr.length === 1 ? 'scale' : 'scales'} · {totalItems} items
          </span>
        </div>
        {instr.length === 0 ? (
          <p className="bld-muted">Add scales below to build your survey instrument.</p>
        ) : (
          <ul className="ms-chosen">
            {instr.map((s) => (
              <li key={s.id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="ms-chosen-name">
                    {s.name} {s.abbreviation && <span className="disc-dim">({s.abbreviation})</span>}
                  </span>
                  <span className="ms-chosen-meta">
                    {s.construct} · {s.itemCount} items{s.alphaSummary ? ` · α ${s.alphaSummary}` : ''}
                  </span>
                  {s.citation && <span className="bld-cite">{s.citation}</span>}
                  {open.has(s.id) && itemsMap[s.id] && <ItemList set={itemsMap[s.id]} />}
                </div>
                <div className="ms-chosen-actions">
                  {itemsMap[s.id] ? (
                    <button className="disc-fulltool ms-items-toggle" onClick={() => toggleItems(s.id)}>
                      {open.has(s.id) ? 'hide items' : 'items'}
                    </button>
                  ) : (
                    <a className="disc-fulltool" href={scaleLink(s.id)} target="_blank" rel="noopener noreferrer">items ↗</a>
                  )}
                  <button className="icon-btn" aria-label="Remove scale" onClick={() => save(instr.filter((x) => x.id !== s.id))}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === 'error' ? (
        <div className="disc-fulltools">
          <span className="disc-fulltools-label">Couldn't reach the catalogue — open ScaleScope ↗</span>
          <div className="disc-fulltools-row">
            {tools.map((t) => (
              <a key={t.name} className="disc-fulltool" href={deepLink(t, topic)} target="_blank" rel="noopener noreferrer">
                {t.name} <Icon name="external" size={12} />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <>
          {suggestions.length > 0 && (
            <section className="bld-section">
              <h2 className="bld-h">Suggested from your framed constructs</h2>
              <p className="anz-fineprint" style={{ marginTop: 0 }}>
                Deterministic token match against the catalogue — no AI. Judge fit yourself: read the items and the
                validation evidence before you commit.
              </p>
              {suggestions.map(({ construct, scales }) => (
                <div key={construct} style={{ marginBottom: 10 }}>
                  <span className="bld-label" style={{ margin: '0 0 6px' }}>{construct}</span>
                  <ul className="ms-chosen">
                    {scales.map((sc) => {
                      const added = inSet.has(sc.id)
                      return (
                        <li key={sc.id}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span className="ms-chosen-name">
                              {sc.name} {sc.abbreviation && <span className="disc-dim">({sc.abbreviation})</span>}
                            </span>
                            <span className="ms-chosen-meta">
                              {sc.construct}
                              {sc.itemCount != null ? ` · ${sc.itemCount} items` : ''}
                              {sc.reliability?.cronbach_alpha ? ` · α ${sc.reliability.cronbach_alpha}` : ''}
                              {' · token match — judge fit yourself'}
                            </span>
                          </div>
                          <div className="ms-chosen-actions">
                            <button className={`btn btn-fill btn-sm ${added ? 'is-on' : ''}`} onClick={() => toggle(sc)}>
                              {added ? <><Icon name="check" size={14} /> Added</> : <><Icon name="plus" size={14} /> Add</>}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </section>
          )}

          <div className="disc-controls">
            <div className="disc-search">
              <Icon name="measure" size={16} />
              <input
                className="disc-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search scales — construct, name, tag…"
              />
            </div>
            <select className="disc-select" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Filter by domain">
              <option value="">All domains</option>
              {all && domainsOf(all).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <p className="disc-count">{results.length} {results.length === 1 ? 'scale' : 'scales'}</p>

          <div className="disc-results">
            {results.slice(0, limit).map((sc) => {
              const added = inSet.has(sc.id)
              return (
                <article key={sc.id} className="disc-card">
                  <div className="disc-card-main">
                    <h3 className="disc-title">
                      {sc.name} {sc.abbreviation && <span className="disc-dim">({sc.abbreviation})</span>}
                    </h3>
                    <p className="disc-meta">
                      {sc.construct && <span>{sc.construct}</span>}
                      {sc.domain && <span className="disc-dim"> · {sc.domain}</span>}
                      {sc.itemCount != null && <span className="disc-dim"> · {sc.itemCount} items</span>}
                      {sc.reliability?.cronbach_alpha && <span className="disc-dim"> · α {sc.reliability.cronbach_alpha}</span>}
                    </p>
                    <div className="disc-chips">
                      {(sc.dimensions || []).map((d) => (
                        <span key={d.name} className="disc-chip" style={{ cursor: 'default' }}>
                          {d.name} ({d.items}{d.alpha != null ? `, α ${d.alpha}` : ''})
                        </span>
                      ))}
                    </div>
                    {sc.citation && <p className="bld-cite">{sc.citation.authors} ({sc.citation.year}). {sc.citation.title}</p>}
                    {open.has(sc.id) && itemsMap[sc.id] && <ItemList set={itemsMap[sc.id]} />}
                  </div>
                  <div className="disc-card-actions">
                    <button className={`btn btn-fill btn-sm ${added ? 'is-on' : ''}`} onClick={() => toggle(sc)}>
                      {added ? <><Icon name="check" size={14} /> Added</> : <><Icon name="plus" size={14} /> Add</>}
                    </button>
                    {itemsMap[sc.id] ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleItems(sc.id)}>
                        {open.has(sc.id) ? 'Hide items' : 'Show items'}
                      </button>
                    ) : (
                      <a className="btn btn-ghost btn-sm" href={scaleLink(sc.id)} target="_blank" rel="noopener noreferrer">Items</a>
                    )}
                  </div>
                </article>
              )
            })}
            {results.length === 0 && <p className="disc-empty">No scales match. Try a broader construct.</p>}
          </div>

          {limit < results.length && (
            <button className="btn btn-ghost disc-more" onClick={() => setLimit((l) => l + PAGE)}>
              Load more ({limit} of {results.length})
            </button>
          )}
        </>
      )}
    </div>
  )
}
