// ============================================================================
// Throughline Studio — hub (landing + dashboard).
// Hero, the seven-stage throughline showcase, and the projects shelf
// (create / resume / delete). This is the front door of the shippable product.
// ============================================================================

import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { VideoLightbox } from '../components/VideoLightbox'
import { navigate } from '../lib/router'
import { STAGES } from '../lib/stages'
import { createProject, deleteProject, loadProjects, progress, subscribe } from '../lib/store'
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

  return (
    <div className="hub">
      {/* ── Hero ──────────────────────────────────────────────────── */}
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

      {/* ── Projects shelf ────────────────────────────────────────── */}
      <section className="shelf">
        <div className="shelf-head">
          <h2 className="section-h2">Your projects</h2>
          {projects.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={14} /> New
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="empty">
            <p className="empty-line">No projects yet.</p>
            <p className="empty-sub">Start one and walk it from discovery to publication.</p>
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
              />
            ))}
          </div>
        )}
      </section>

      {/* ── The seven stages ──────────────────────────────────────── */}
      <section className="stages-show" id="stages">
        <h2 className="section-h2">The throughline</h2>
        <p className="section-sub">
          Seven stages, each one unifying the tools you already use — deep-linked so your topic
          travels with you.
        </p>
        <ol className="stages-rail">
          {STAGES.map((s) => (
            <li className="stage-chip" key={s.id} data-n={s.n}>
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
            </li>
          ))}
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
    </div>
  )
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
}) {
  const pct = Math.round(progress(project) * 100)
  return (
    <article className="project-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}>
      <div className="project-card-head">
        <h3 className="project-card-title">{project.title}</h3>
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
      <div className="project-progress" aria-label={`${pct}% complete`}>
        <div className="project-progress-fill" style={{ width: `${pct}%` }} />
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
        <h2 className="modal-title">New research project</h2>
        <p className="modal-sub">A working title and field — both editable later.</p>
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
