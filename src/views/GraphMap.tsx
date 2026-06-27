// ============================================================================
// Throughline Studio — the verified knowledge graph ("Map").
//
// Ask one thing — a construct, a topic — and get the whole connected, verified
// answer in one place: the theories that frame it, the validated scales that
// measure it (with verbatim items), the corpus papers coded to it, and the
// reference books that cover it. Every edge links out to the real tool and is
// badged "verify" where machine-matched. Nothing here is generated.
//
// This is the single answer that makes a single front door worth it: instead of
// visiting twelve tools, the researcher sees how they connect — then starts a
// project on the construct and walks it A→Z.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  booksLink,
  corpusLink,
  graphTotals,
  loadGraph,
  scaleLink,
  searchConstructs,
  theoryLink,
  type GraphConstruct,
} from '../lib/graph'
import { navigate } from '../lib/router'
import { createProject, saveProject } from '../lib/store'

export function GraphMap({ code }: { code?: string }) {
  const [all, setAll] = useState<GraphConstruct[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let on = true
    loadGraph().then((g) => {
      if (on) setAll(g)
    })
    return () => {
      on = false
    }
  }, [])

  const selected = useMemo(
    () => (code && all ? all.find((c) => c.code === code) ?? null : null),
    [code, all],
  )

  const totals = useMemo(() => (all ? graphTotals(all) : null), [all])

  // When a construct is open, the search box re-filters the rail; otherwise it
  // drives the landing search.
  const results = useMemo(
    () => (all ? searchConstructs(all, query, query ? 14 : 12) : []),
    [all, query],
  )

  function open(c: GraphConstruct) {
    navigate(`/map/${c.code}`)
  }

  function startProject(c: GraphConstruct) {
    const p = createProject(c.name, 'Organizational Behavior')
    p.question = `How does ${c.name.toLowerCase()} relate to …?`
    saveProject(p) // persist the seeded question
    navigate(`/p/${p.id}`)
  }

  return (
    <main className="gmap" id="main">
      <header className="gmap-head">
        <div className="gmap-head-row">
          <a
            className="btn btn-ghost btn-sm"
            href="#/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
          >
            <Icon name="back" size={14} /> Hub
          </a>
          <p className="hero-kicker" style={{ margin: 0 }}>
            The verified knowledge graph
          </p>
        </div>
        <h1 className="gmap-title">
          One construct, the <span className="grad-text">whole thread</span>
        </h1>
        <p className="gmap-sub">
          Type a construct or topic. See the theories that frame it, the validated scales that
          measure it, the corpus papers coded to it, and the books that cover it — every link a
          real record, nothing invented.
        </p>
        {totals && (
          <p className="gmap-totals">
            {totals.constructs} constructs · {totals.theories.toLocaleString()} theory links ·{' '}
            {totals.scales.toLocaleString()} scale links — across a hand-coded corpus of 9,388
            papers. Every edge a real record, nothing invented.
          </p>
        )}
      </header>

      <div className="gmap-searchbar">
        <Icon name="discover" size={18} />
        <input
          className="gmap-input"
          autoFocus
          value={query}
          placeholder="e.g. work engagement, abusive supervision, psychological safety"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search constructs"
        />
        {query && (
          <button className="gmap-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {!all && <p className="gmap-loading">Loading the verified graph…</p>}

      {all && all.length === 0 && (
        <p className="gmap-loading">
          Couldn't reach the corpus snapshots (offline?). The graph links the Research Book and
          ScaleScope — try again when connected.
        </p>
      )}

      {all && all.length > 0 && (
        <div className="gmap-body">
          {/* ── left rail: ranked construct hits ── */}
          <nav className="gmap-rail" aria-label="Constructs">
            {results.map((c) => (
              <button
                key={c.code}
                className={`gmap-railitem ${selected?.code === c.code ? 'is-active' : ''}`}
                onClick={() => open(c)}
              >
                <span className="gmap-railname">{c.name}</span>
                <span className="gmap-railmeta">
                  {c.paperCount > 0 && <em>{c.paperCount} papers</em>}
                  {c.theories.length > 0 && <em>🧠 {c.theories.length}</em>}
                  {c.scales.length > 0 && <em>📏 {c.scales.length}</em>}
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="gmap-loading" style={{ padding: '12px' }}>
                No construct matches “{query}”. The corpus covers 167 OB/management constructs — try
                a broader term.
              </p>
            )}
          </nav>

          {/* ── connected answer ── */}
          <section className="gmap-answer">
            {selected ? (
              <ConstructPanel c={selected} onStart={() => startProject(selected)} />
            ) : (
              <div className="gmap-placeholder">
                <p className="gmap-placeholder-lead">Pick a construct to see its thread.</p>
                <p className="gmap-placeholder-sub">
                  Every construct is one node connecting four real-data libraries — the answer no
                  single tool gives you.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

// ── one construct's full connected answer ──────────────────────────────────
function ConstructPanel({ c, onStart }: { c: GraphConstruct; onStart: () => void }) {
  return (
    <article className="gc" key={c.code}>
      <div className="gc-head">
        <h2 className="gc-name">{c.name}</h2>
        <div className="gc-stats">
          {c.paperCount > 0 && (
            <span className="gc-stat">
              <b>{c.paperCount}</b> corpus papers
            </span>
          )}
          <span className="gc-stat">
            <b>{c.theories.length}</b> theories
          </span>
          <span className="gc-stat">
            <b>{c.scales.length}</b> scales
          </span>
        </div>
        {c.identifiers.length > 0 && (
          <p className="gc-aliases">
            also: {c.identifiers.slice(0, 6).join(' · ')}
            {c.identifiers.length > 6 ? ' …' : ''}
          </p>
        )}
      </div>

      {/* THEORIES */}
      <section className="gc-sec">
        <h3 className="gc-sec-h">🧠 Theories that frame it</h3>
        {c.theories.length ? (
          <div className="gc-chips">
            {c.theories.map((t) => (
              <a
                key={t.s}
                className="gc-chip"
                href={theoryLink(t.s)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in TheoryScope"
              >
                {t.n} <Icon name="external" size={12} />
              </a>
            ))}
          </div>
        ) : (
          <p className="gc-empty">No theory mapped to this construct yet in the crosswalk.</p>
        )}
      </section>

      {/* SCALES */}
      <section className="gc-sec">
        <h3 className="gc-sec-h">📏 Validated scales that measure it</h3>
        {c.scales.length ? (
          <div className="gc-scales">
            {c.scales.map((s) => (
              <ScaleRow key={`${s.id ?? s.n}`} id={s.id} name={s.n} ab={s.ab} />
            ))}
          </div>
        ) : (
          <p className="gc-empty">
            No validated scale mapped here yet — browse{' '}
            <a href="https://scalescope.vercel.app/" target="_blank" rel="noopener noreferrer">
              ScaleScope ↗
            </a>
            .
          </p>
        )}
      </section>

      {/* PAPERS + BOOKS */}
      <section className="gc-sec gc-sec-row">
        <a className="gc-bigchip" href={corpusLink(c.code)} target="_blank" rel="noopener noreferrer">
          <span className="gc-bigchip-emoji">📚</span>
          <span>
            <b>{c.paperCount || 'View'} corpus papers</b>
            <em>coded to this construct in the Research Book</em>
          </span>
          <Icon name="external" size={14} />
        </a>
        <a className="gc-bigchip" href={booksLink(c.name)} target="_blank" rel="noopener noreferrer">
          <span className="gc-bigchip-emoji">📖</span>
          <span>
            <b>Reference books</b>
            <em>search BookScope for full-text coverage</em>
          </span>
          <Icon name="external" size={14} />
        </a>
      </section>

      <div className="gc-foot">
        <button className="btn btn-fill" onClick={onStart}>
          <Icon name="plus" size={15} /> Start a project on this construct
        </button>
        <p className="gc-verify">
          Theory & scale links are deterministic label matches via the Research Book crosswalk —
          machine-matched · verify. Paper counts &amp; constructs are from Syed's hand-coded corpus.
        </p>
      </div>
    </article>
  )
}

// ── a single scale: link out + lazy verbatim items ─────────────────────────
function ScaleRow({ id, name, ab }: { id?: number; name: string; ab?: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<{ text: string; reversed?: boolean }[] | null>(null)
  const [citation, setCitation] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && items === null && id != null) {
      setLoading(true)
      try {
        const { loadScaleItems, loadScales, scaleCitation } = await import('../lib/scales')
        const [itemMap, scales] = await Promise.all([loadScaleItems(), loadScales()])
        const set = itemMap[id]
        setItems(set?.items?.map((it) => ({ text: it.text, reversed: it.reversed })) ?? [])
        const full = scales.find((s) => s.id === id)
        if (full) setCitation(scaleCitation(full))
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="gc-scale">
      <div className="gc-scale-top">
        <button className="gc-scale-name" onClick={toggle} aria-expanded={open}>
          <span className="gc-scale-tw">{open ? '▾' : '▸'}</span>
          {ab ? <b>{ab}</b> : null} {name}
        </button>
        {id != null && (
          <a
            className="gc-scale-link"
            href={scaleLink(id)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in ScaleScope"
          >
            <Icon name="external" size={13} />
          </a>
        )}
      </div>
      {open && (
        <div className="gc-scale-items">
          {loading && <p className="gc-empty">Loading verbatim items…</p>}
          {!loading && items && items.length > 0 && (
            <>
              {citation && <p className="gc-scale-cite">{citation}</p>}
              <ol className="gc-itemlist">
                {items.map((it, i) => (
                  <li key={i}>
                    {it.text}
                    {it.reversed && <span className="gc-rev"> (R)</span>}
                  </li>
                ))}
              </ol>
              <p className="gc-verify">Items reproduced verbatim from ScaleScope.</p>
            </>
          )}
          {!loading && items && items.length === 0 && (
            <p className="gc-empty">
              Items aren't reproducible for this scale — open it in ScaleScope for source &amp;
              permissions.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
