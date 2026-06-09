// ============================================================================
// Throughline Studio — Discover stage workspace.
// Real literature discovery over Syed's Research Book corpus (9,388 hand-coded
// papers / 167 constructs). Search, filter by construct, peek abstracts, and
// build a reading list that persists on the project and carries forward.
// Falls back gracefully (open-in-full-tool links) if the corpus can't load.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  getAbstract,
  loadCorpus,
  readingList,
  searchCorpus,
  toSaved,
  type Corpus,
  type CorpusFilters,
  type CorpusPaper,
  type SavedPaper,
} from '../lib/corpus'
import { deepLink, stageDef } from '../lib/stages'
import { setStageData } from '../lib/store'
import type { Project } from '../lib/types'

const PAGE = 25

export function DiscoverBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [corpus, setCorpus] = useState<Corpus | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [filters, setFilters] = useState<CorpusFilters>({
    query: '',
    constructCode: '',
    oaOnly: false,
    sort: 'percentile',
  })
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<Record<string, string | 'loading'>>({})
  const [showList, setShowList] = useState(false)

  useEffect(() => {
    let alive = true
    loadCorpus()
      .then((c) => {
        if (alive) {
          setCorpus(c)
          setStatus('ready')
        }
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  // reset pagination when the query/filters change
  useEffect(() => {
    setLimit(PAGE)
  }, [filters.query, filters.constructCode, filters.oaOnly, filters.sort])

  const results = useMemo(
    () => (corpus ? searchCorpus(corpus, filters) : []),
    [corpus, filters],
  )

  const list = readingList(project)
  const inList = useMemo(() => new Set(list.map((p) => p.id)), [list])

  function saveList(next: SavedPaper[]) {
    const data = { ...(project.stages.discover.data || {}), papers: next }
    onChange(setStageData(project, 'discover', data))
  }
  function toggleSave(cp: CorpusPaper) {
    if (!corpus) return
    const sid = cp.doi || cp.id
    saveList(inList.has(sid) ? list.filter((x) => x.id !== sid) : [toSaved(cp, corpus.codeToName), ...list])
  }
  function remove(id: string) {
    saveList(list.filter((x) => x.id !== id))
  }

  function toggleAbstract(cp: CorpusPaper) {
    const id = cp.id
    if (open[id] !== undefined) {
      setOpen((o) => {
        const next = { ...o }
        delete next[id]
        return next
      })
      return
    }
    setOpen((o) => ({ ...o, [id]: 'loading' }))
    getAbstract(id).then((text) =>
      setOpen((o) => ({ ...o, [id]: text || '— No abstract on record for this paper.' })),
    )
  }

  // ── loading / error ──────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="disc-state">
        <span className="spinner" aria-hidden="true" />
        <p>Loading the corpus — 9,388 papers across 167 constructs…</p>
      </div>
    )
  }
  if (status === 'error' || !corpus) {
    return <FallbackTools topic={topic} />
  }

  const shown = results.slice(0, limit)

  return (
    <div className="disc">
      <p className="disc-lead">
        Searching <strong>{corpus.papers.length.toLocaleString()}</strong> hand-coded papers across{' '}
        <strong>{corpus.constructs.length}</strong> constructs — Syed's Research Book corpus.
      </p>

      {/* reading list disclosure */}
      <button className="disc-list-bar" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
        <Icon name="check" size={15} />
        <span>
          Reading list — <strong>{list.length}</strong> {list.length === 1 ? 'paper' : 'papers'}
        </span>
        <span className="disc-list-hint">{showList ? 'hide' : list.length ? 'show' : ''}</span>
      </button>
      {showList && list.length > 0 && (
        <ul className="disc-saved">
          {list.map((p) => (
            <li key={p.id}>
              <span className="disc-saved-t">
                {p.title} {p.year && <span className="disc-dim">· {p.year}</span>}
              </span>
              <button className="icon-btn" aria-label="Remove" onClick={() => remove(p.id)}>
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {showList && list.length === 0 && (
        <p className="disc-saved-empty">Add papers below to build the reading list this stage carries forward.</p>
      )}

      {/* controls */}
      <div className="disc-controls">
        <div className="disc-search">
          <Icon name="discover" size={16} />
          <input
            className="disc-search-input"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search title, author, journal…"
            aria-label="Search the corpus"
          />
        </div>
        <select
          className="disc-select"
          value={filters.constructCode}
          onChange={(e) => setFilters((f) => ({ ...f, constructCode: e.target.value }))}
          aria-label="Filter by construct"
        >
          <option value="">All constructs</option>
          {corpus.constructs.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.paperCount})
            </option>
          ))}
        </select>
        <select
          className="disc-select disc-select-sm"
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as CorpusFilters['sort'] }))}
          aria-label="Sort results"
        >
          <option value="percentile">Top Scopus</option>
          <option value="year-desc">Newest</option>
          <option value="citations">Most cited</option>
        </select>
        <label className="disc-oa">
          <input
            type="checkbox"
            checked={filters.oaOnly}
            onChange={(e) => setFilters((f) => ({ ...f, oaOnly: e.target.checked }))}
          />
          Open access
        </label>
      </div>

      <p className="disc-count">
        {results.length.toLocaleString()} {results.length === 1 ? 'match' : 'matches'}
        {filters.constructCode && corpus.codeToName.get(filters.constructCode)
          ? ` in ${corpus.codeToName.get(filters.constructCode)}`
          : ''}
      </p>

      {/* results */}
      <div className="disc-results">
        {shown.map((cp) => {
          const sid = cp.doi || cp.id
          const saved = inList.has(sid)
          const abs = open[cp.id]
          return (
            <article key={cp.id} className="disc-card">
              <div className="disc-card-main">
                <h3 className="disc-title">
                  {cp.doi ? (
                    <a href={`https://doi.org/${cp.doi}`} target="_blank" rel="noopener noreferrer">
                      {cp.title}
                    </a>
                  ) : (
                    cp.title
                  )}
                </h3>
                <p className="disc-meta">
                  <span>{authorLine(cp.authors)}</span>
                  {cp.year && <span className="disc-dim"> · {cp.year}</span>}
                  {cp.journal && <span className="disc-dim"> · {cp.journal}</span>}
                </p>
                <div className="disc-badges">
                  {typeof cp.scopusPercentile === 'number' && (
                    <span className="disc-badge disc-badge-p">Scopus p{cp.scopusPercentile}</span>
                  )}
                  {cp.openAccess && <span className="disc-badge disc-badge-oa">OA</span>}
                  {typeof cp.citations === 'number' && cp.citations > 0 && (
                    <span className="disc-badge">{cp.citations} cites</span>
                  )}
                </div>
                <div className="disc-chips">
                  {cp.constructCodes.map((code) => (
                    <button
                      key={code}
                      className="disc-chip"
                      onClick={() => setFilters((f) => ({ ...f, constructCode: code }))}
                      title="Filter by this construct"
                    >
                      {corpus.codeToName.get(code) || code}
                    </button>
                  ))}
                </div>
                {abs !== undefined && (
                  <p className="disc-abstract">{abs === 'loading' ? 'Loading abstract…' : abs}</p>
                )}
              </div>
              <div className="disc-card-actions">
                <button className={`btn btn-fill btn-sm ${saved ? 'is-on' : ''}`} onClick={() => toggleSave(cp)}>
                  {saved ? (
                    <>
                      <Icon name="check" size={14} /> Added
                    </>
                  ) : (
                    <>
                      <Icon name="plus" size={14} /> Add
                    </>
                  )}
                </button>
                {cp.hasAbstract && (
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleAbstract(cp)}>
                    {abs !== undefined ? 'Hide' : 'Abstract'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
        {results.length === 0 && (
          <p className="disc-empty">No matches. Try a broader term or clear the construct filter.</p>
        )}
      </div>

      {limit < results.length && (
        <button className="btn btn-ghost disc-more" onClick={() => setLimit((l) => l + PAGE)}>
          Load {Math.min(PAGE, results.length - limit)} more ({limit} of {results.length})
        </button>
      )}

      <FallbackTools topic={topic} compact />
    </div>
  )
}

function authorLine(authors: string[]): string {
  if (!authors || authors.length === 0) return '—'
  if (authors.length <= 3) return authors.join(', ')
  return authors.slice(0, 3).join(', ') + ' et al.'
}

/** Deep-link row into the full discovery tools (also the error fallback). */
function FallbackTools({ topic, compact }: { topic: string; compact?: boolean }) {
  const tools = stageDef('discover').tools
  return (
    <div className={compact ? 'disc-fulltools' : 'disc-state'}>
      {!compact && <p>Couldn’t reach the corpus right now. Open the full discovery tools instead:</p>}
      {compact && <span className="disc-fulltools-label">Go deeper in the full tools ↗</span>}
      <div className="disc-fulltools-row">
        {tools.map((t) => (
          <a key={t.name} className="disc-fulltool" href={deepLink(t, topic)} target="_blank" rel="noopener noreferrer">
            {t.name} <Icon name="external" size={12} />
          </a>
        ))}
      </div>
    </div>
  )
}
