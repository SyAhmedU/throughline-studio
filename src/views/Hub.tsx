// ============================================================================
// Throughline Studio — hub (landing + dashboard).
// Hero, the seven-stage throughline showcase, and the projects shelf
// (create / resume / delete). This is the front door of the shippable product.
// ============================================================================

import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { VideoLightbox } from '../components/VideoLightbox'
import { derivedStatus } from '../lib/artifacts'
import { navigate } from '../lib/router'
import { STAGES } from '../lib/stages'
import { createProject, deleteProject, loadProjects, progress, saveProject, subscribe } from '../lib/store'
import type { Project } from '../lib/types'

export function Hub() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [showNew, setShowNew] = useState(false)
  const [showTour, setShowTour] = useState(false)

  function refresh() {
    setProjects(loadProjects())
  }

  // Refresh when the store changes — including projects pulled down from the
  // cloud after sign-in (which arrive asynchronously).
  useEffect(() => subscribe(refresh), [])

  function start(title: string, field: string) {
    const p = createProject(title, field)
    navigate(`/p/${p.id}`)
  }

  /** Restore a project from the JSON backup the workspace header exports —
   *  the escape hatch while cloud sync is down (projects otherwise live only
   *  in one browser's localStorage). */
  async function importFile(f: File) {
    try {
      const p = JSON.parse(await f.text()) as Project
      if (!p || typeof p !== 'object' || !p.id || !p.title || !p.stages) {
        throw new Error('that is not a Throughline Studio project file')
      }
      saveProject(p)
      refresh()
      navigate(`/p/${p.id}`)
    } catch (e) {
      alert(`Couldn't import — ${(e as Error).message}. Use Export in a project's header to create a valid backup.`)
    }
  }

  // a returning user has projects: lead with the work, retire the pitch
  const returning = projects.length > 0

  return (
    // main#main: the skip-link target and screen-reader landmark — ProjectView
    // carries its own; every routed view needs one
    <main className="hub" id="main">
      {/* ── Hero — full pitch for strangers, a slim band for returners ── */}
      {returning ? (
        <section className="hero hero-compact">
          <p className="hero-kicker">The shippable research workspace</p>
          <div className="hero-compact-row">
            <h1 className="hero-title hero-title-compact">
              Pick up the thread<span className="grad-text">.</span>
            </h1>
            <div className="hero-cta hero-cta-compact">
              <button className="btn btn-fill" onClick={() => setShowNew(true)}>
                <Icon name="plus" size={15} /> New research project
              </button>
              <a
                className="btn btn-ghost"
                href="#/map"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/map')
                }}
              >
                🧵 Knowledge graph
              </a>
              <a
                className="btn btn-ghost"
                href="#/examples"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/examples')
                }}
              >
                Worked examples
              </a>
              <button className="btn btn-ghost" onClick={() => setShowTour(true)}>
                ▶ Tour
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-thread" aria-hidden="true" />
          <p className="hero-kicker">The shippable research workspace</p>
          <h1 className="hero-title">
            Conduct research, <span className="grad-text">A&nbsp;→&nbsp;Z</span>
          </h1>
          <p className="hero-sub">
            One connected throughline — discover the literature, frame the question, build the
            measures, collect and analyze the data, then write and place the paper. Every step
            carries the last one forward.
          </p>
          <div className="hero-cta">
            <button className="btn btn-fill btn-lg" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={17} /> New research project
            </button>
            <a
              className="btn btn-ghost btn-lg"
              href="#/map"
              onClick={(e) => {
                e.preventDefault()
                navigate('/map')
              }}
            >
              🧵 Explore the knowledge graph
            </a>
            <a
              className="btn btn-ghost btn-lg"
              href="#/examples"
              onClick={(e) => {
                e.preventDefault()
                navigate('/examples')
              }}
            >
              See 20 worked examples
            </a>
          </div>

          {/* muted living preview; click for the full narrated tour */}
          <button
            className="hero-tour"
            onClick={() => setShowTour(true)}
            aria-label="Watch the 90-second narrated tour"
          >
            <video
              className="hero-tour-video"
              src="/tour.mp4"
              poster="/tour-poster.jpg"
              muted
              loop
              playsInline
              autoPlay={!prefersReducedMotion()}
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            />
            <span className="hero-tour-overlay">
              <span className="hero-tour-play">▶</span>
              Watch the 90-second tour — with sound
            </span>
          </button>
        </section>
      )}

      {/* ── Projects shelf ────────────────────────────────────────── */}
      <section className="shelf">
        <div className="shelf-head">
          <h2 className="section-h2">Your projects</h2>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }} title="Restore a project from a JSON backup exported from its workspace header">
            <Icon name="arrow" size={14} /> Import
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void importFile(f)
              }}
            />
          </label>
          {projects.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={14} /> New
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="empty">
            <div className="empty-thread" aria-hidden="true">
              <b className="empty-thread-cap">A</b>
              {STAGES.map((s) => (
                <span className="empty-thread-node" key={s.id} title={s.title} />
              ))}
              <b className="empty-thread-cap">Z</b>
            </div>
            <p className="empty-line">Your throughline starts here.</p>
            <p className="empty-sub">Start a project and walk it from discovery to publication.</p>
            <button className="btn btn-fill" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={16} /> Start your first project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => navigate(`/p/${p.id}`)}
                onDelete={() => {
                  if (confirm(`Delete “${p.title}”? This cannot be undone.`)) {
                    deleteProject(p.id)
                    refresh()
                  }
                }}
                onDuplicate={() => {
                  const copy: Project = {
                    ...structuredClone(p),
                    id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    title: `${p.title} (copy)`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                  saveProject(copy)
                  refresh()
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── The seven stages — the literal throughline ────────────── */}
      <section className="stages-show" id="stages">
        <h2 className="section-h2">The throughline</h2>
        <p className="section-sub">
          Seven stages, each one unifying the tools you already use — deep-linked so your topic
          travels with you.
        </p>
        <ol className="stages-rail">
          <span className="stages-thread" aria-hidden="true" />
          <span className="stages-thread-fill" aria-hidden="true" />
          <span className="stages-cap stages-cap-a" aria-hidden="true">A</span>
          {STAGES.map((s) => (
            <li className="stage-stop" key={s.id} data-reveal>
              <span className="stage-stop-node" aria-hidden="true" />
              <div className="stage-chip" data-n={s.n}>
                <div className="stage-chip-top">
                  <span className="stage-chip-icon">
                    <Icon name={s.id} size={18} />
                  </span>
                  <span className="stage-chip-n">{String(s.n).padStart(2, '0')}</span>
                </div>
                <h3 className="stage-chip-title">{s.title}</h3>
                <p className="stage-chip-brief">{s.brief}</p>
                <div className="stage-chip-tools">
                  {s.tools.map((t) => (
                    <span key={t.name} className="tool-tag">
                      {t.name}
                    </span>
                  ))}
                </div>
                <p className="stage-chip-carry">→ carries {s.carries}</p>
              </div>
            </li>
          ))}
          <span className="stages-cap stages-cap-z" aria-hidden="true">Z</span>
        </ol>
        <div className="stages-cta">
          <a
            href="#/examples"
            onClick={(e) => {
              e.preventDefault()
              navigate('/examples')
            }}
          >
            See the throughline walked on 20 real papers <Icon name="arrow" size={14} />
          </a>
        </div>
      </section>

      <footer className="hub-foot">
        <span>Throughline Studio</span>
        <span className="dot-sep">·</span>
        <span>part of the research suite</span>
        <span className="dot-sep">·</span>
        <a href="https://syahmedu.github.io/nexus/" target="_blank" rel="noopener noreferrer">
          all projects ↗
        </a>
      </footer>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={start} />}
      {showTour && (
        <VideoLightbox src="/tour.mp4" poster="/tour-poster.jpg" label="Product tour video" onClose={() => setShowTour(false)} />
      )}
    </main>
  )
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onDuplicate,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const pct = Math.round(progress(project) * 100)
  return (
    <article className="project-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}>
      <div className="project-card-head">
        <h3 className="project-card-title">{project.title}</h3>
        {/* Duplicate sits before Delete so the destructive control is no
            longer the card's only inline affordance (audit B23) */}
        <button
          className="icon-btn"
          aria-label="Duplicate project"
          title="Duplicate this project (copies every stage)"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
        >
          <Icon name="plus" size={15} />
        </button>
        <button
          className="icon-btn"
          aria-label="Delete project"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
      {project.field && <p className="project-card-field">{project.field}</p>}
      {project.question && <p className="project-card-q">{project.question}</p>}
      {/* the project's own mini-spine: seven hue segments, status-aware */}
      <div className="project-spine" aria-label={`${pct}% complete`} role="img">
        {STAGES.map((s) => {
          const st = derivedStatus(project, s.id)
          const cur = s.id === project.current
          return (
            <span
              key={s.id}
              className={`project-spine-seg is-${st} ${cur ? 'is-here' : ''}`}
              title={`${s.title} — ${st}`}
            />
          )
        })}
      </div>
      <div className="project-card-foot">
        <span>{pct}% · stage {stageNumber(project)}/7</span>
        <span className="project-open">Open <Icon name="arrow" size={13} /></span>
      </div>
    </article>
  )
}

function stageNumber(p: Project): number {
  return STAGES.findIndex((s) => s.id === p.current) + 1
}

// Common disciplines for this suite (OB/management-centred corpus). Offered as
// one-tap chips so the field isn't a blank box — and, per the IKEA/endowment
// effect, every small choice the user makes here is a bit of themselves
// invested in the project before it even opens, which makes them far likelier
// to carry it forward than an empty two-field form would.
const FIELD_CHIPS = [
  'Organizational Behavior',
  'Management',
  'Psychology',
  'Human Resources',
  'Marketing',
  'Education',
]

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, field: string) => void
}) {
  const [title, setTitle] = useState('')
  const [field, setField] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="modal-title">Start your throughline</h2>
        <p className="modal-sub">Just a working title to begin — everything's editable later, and the whole A→Z workspace opens the moment you do.</p>
        <label className="field-label" htmlFor="np-title">
          Title
        </label>
        <input
          id="np-title"
          className="field-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Remote work & team cohesion"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) onCreate(title, field)
          }}
        />
        <label className="field-label" htmlFor="np-field">
          Field / discipline
        </label>
        <input
          id="np-field"
          className="field-input"
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="e.g. Organizational Behavior"
        />
        <div className="np-field-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
          {FIELD_CHIPS.map((f) => (
            <button
              key={f}
              type="button"
              className={`np-chip${field === f ? ' is-on' : ''}`}
              aria-pressed={field === f}
              onClick={() => setField(f)}
              style={{
                fontSize: 12.5,
                padding: '5px 11px',
                borderRadius: 999,
                cursor: 'pointer',
                border: '1px solid var(--line, rgba(128,128,128,.28))',
                background: field === f ? 'var(--accent, #F14575)' : 'transparent',
                color: field === f ? '#fff' : 'var(--ink-2, inherit)',
                transition: 'background .15s, color .15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-fill"
            disabled={!title.trim()}
            onClick={() => onCreate(title, field)}
          >
            Create & open <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
