// ============================================================================
// Throughline Studio — Discover stage workspace.
// Real literature discovery over Syed's Research Book corpus (9,388 hand-coded
// papers / 167 constructs). Search, filter by construct, peek abstracts, and
// build a reading list that persists on the project and carries forward.
// Falls back gracefully (open-in-full-tool links) if the corpus can't load.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  getAbstract,
  getRecentAbstract,
  loadCorpus,
  loadRecent,
  readingList,
  searchCorpus,
  searchLive,
  toSaved,
  type Corpus,
  type CorpusFilters,
  type CorpusPaper,
  type LivePaper,
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
  const [liveOn, setLiveOn] = useState(false)
  const [livePapers, setLivePapers] = useState<LivePaper[]>([])
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [recentOn, setRecentOn] = useState(false)
  const [recentPapers, setRecentPapers] = useState<CorpusPaper[]>([])
  const [recentStatus, setRecentStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  // ↑ recent tier — explicit opt-in (it's a ~42 MB one-time fetch), remembered
  // per browser in localStorage.tls_recent so it re-loads on the next visit.
  const recentStarted = useRef(false)
  function startRecentLoad() {
    if (recentStarted.current) return
    recentStarted.current = true
    setRecentStatus('loading')
    loadRecent()
      .then((ps) => {
        setRecentPapers(ps)
        setRecentStatus('ready')
      })
      .catch(() => {
        recentStarted.current = false // allow a retry on re-check
        setRecentStatus('error')
      })
  }
  function toggleRecent(checked: boolean) {
    setRecentOn(checked)
    try {
      if (checked) localStorage.setItem('tls_recent', '1')
      else localStorage.removeItem('tls_recent')
    } catch {
      /* storage unavailable — the toggle still works for this visit */
    }
    if (checked) startRecentLoad()
  }
  useEffect(() => {
    try {
      if (localStorage.getItem('tls_recent') === '1') {
        setRecentOn(true)
        startRecentLoad()
      }
    } catch {
      /* ignore */
    }
  }, [])

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

  // hand-coded corpus + (when opted in) the recent tier, searched as one pool —
  // recent records stay visibly badged on every card, never silently mixed.
  const recentActive = recentOn && recentStatus === 'ready' && recentPapers.length > 0
  const results = useMemo(() => {
    if (!corpus) return []
    const pool = recentActive ? { ...corpus, papers: [...corpus.papers, ...recentPapers] } : corpus
    return searchCorpus(pool, filters)
  }, [corpus, filters, recentActive, recentPapers])

  // ⚡ live layer — newest OpenAlex works for the current query/construct.
  // Fetched only when toggled on and there is something to search for.
  const liveQuery =
    filters.query.trim().length >= 4
      ? filters.query.trim()
      : filters.constructCode && corpus
        ? corpus.codeToName.get(filters.constructCode) || ''
        : ''
  useEffect(() => {
    if (!liveOn || !liveQuery) {
      setLivePapers([])
      setLiveStatus('idle')
      return
    }
    const ctl = new AbortController()
    setLiveStatus('loading')
    const t = window.setTimeout(() => {
      searchLive(liveQuery, ctl.signal)
        .then((ps) => {
          setLivePapers(ps)
          setLiveStatus('ready')
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setLiveStatus('error')
        })
    }, 450)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [liveOn, liveQuery])

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
    // recent-tier abstracts live in DOI-hashed shards; hand-coded ones in one file
    const fetchText = cp.recent ? getRecentAbstract(cp.doi) : getAbstract(id)
    fetchText.then((text) =>
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
        Searching <strong>{corpus.papers.length.toLocaleString()}</strong> hand-coded papers
        {recentActive && (
          <>
            {' '}+ <strong>{recentPapers.length.toLocaleString()}</strong> recent (OpenAlex 2024→, machine-tagged to
            the same {corpus.constructs.length} constructs)
          </>
        )}{' '}
        across <strong>{corpus.constructs.length}</strong> constructs — Syed's Research Book corpus.{' '}
        <span className="disc-dim">
          Coverage is OB / management, coded by one researcher — a gap here may just be the corpus's edge. For other
          fields, or to check recall, use the ↑ recent tier, the ⚡ live OpenAlex layer, or the full tools below.
        </span>
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
        <label className="disc-oa" title="Also pull the newest works (last 60 days) live from OpenAlex for this search — real records, machine-matched, verify before citing">
          <input type="checkbox" checked={liveOn} onChange={(e) => setLiveOn(e.target.checked)} />
          ⚡ Live
        </label>
        <label className="disc-oa" title="Also search the Research Book's recent tier — real OpenAlex papers (2024→) machine-tagged to the same 167 constructs. One-time ~42 MB load, remembered on this browser.">
          <input type="checkbox" checked={recentOn} onChange={(e) => toggleRecent(e.target.checked)} />
          ↑ Recent
        </label>
      </div>

      {recentOn && recentStatus === 'loading' && (
        <p className="disc-count">↑ loading the recent tier — one-time ~42 MB, this can take a minute…</p>
      )}
      {recentOn && recentStatus === 'error' && (
        <p className="disc-count">↑ couldn't load the recent tier — hand-coded results below are unaffected.</p>
      )}

      {/* ⚡ live results — clearly separated from the hand-coded corpus */}
      {liveOn && (
        <div className="disc-live">
          {liveStatus === 'loading' && <p className="disc-count">⚡ pulling this month's papers from OpenAlex…</p>}
          {liveStatus === 'error' && <p className="disc-count">⚡ OpenAlex unavailable right now — corpus results below are unaffected.</p>}
          {liveStatus === 'idle' && !liveQuery && (
            <p className="disc-count">⚡ type a search (4+ characters) or pick a construct to pull the newest papers live.</p>
          )}
          {liveStatus === 'ready' && (
            <>
              <p className="disc-count">
                ⚡ <strong>{livePapers.length}</strong> just-published (last 60 days, OpenAlex) — machine-matched to “{liveQuery}”, verify before citing
              </p>
              {livePapers.map((lp) => {
                const sid = lp.doi || lp.id
                const saved = inList.has(sid)
                const abs = open[lp.id]
                return (
                  <article key={lp.id} className="disc-card">
                    <div className="disc-card-main">
                      <h3 className="disc-title">
                        {lp.doi ? (
                          <a href={`https://doi.org/${lp.doi}`} target="_blank" rel="noopener noreferrer">{lp.title}</a>
                        ) : (
                          <a href={lp.id} target="_blank" rel="noopener noreferrer">{lp.title}</a>
                        )}
                      </h3>
                      <p className="disc-meta">
                        <span>{authorLine(lp.authors)}</span>
                        {lp.year && <span className="disc-dim"> · {lp.year}</span>}
                        {lp.journal && <span className="disc-dim"> · {lp.journal}</span>}
                      </p>
                      <div className="disc-badges">
                        <span className="disc-badge disc-badge-live">⚡ live · verify</span>
                        {lp.openAccess && <span className="disc-badge disc-badge-oa">OA</span>}
                      </div>
                      {abs !== undefined && <p className="disc-abstract">{abs}</p>}
                    </div>
                    <div className="disc-card-actions">
                      <button className={`btn btn-fill btn-sm ${saved ? 'is-on' : ''}`} onClick={() => toggleSave(lp)}>
                        {saved ? (<><Icon name="check" size={14} /> Added</>) : (<><Icon name="plus" size={14} /> Add</>)}
                      </button>
                      {lp.abstractText && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setOpen((o) => {
                              const next = { ...o }
                              if (next[lp.id] !== undefined) delete next[lp.id]
                              else next[lp.id] = lp.abstractText!
                              return next
                            })
                          }
                        >
                          {abs !== undefined ? 'Hide' : 'Abstract'}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </>
          )}
        </div>
      )}

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
                  {cp.recent && <span className="disc-badge disc-badge-recent">↑ recent · machine-tagged</span>}
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
