// ============================================================================
// Throughline Studio — project workspace.
// The spine on the left, the active stage workspace on the right. The header
// carries the editable title + research question (the question is the topic
// that deep-links into every tool).
// ============================================================================

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { Spine } from '../components/Spine'
import { carrySummary, derivedStatus } from '../lib/artifacts'
import { navigate } from '../lib/router'
import { STAGE_IDS, STAGES } from '../lib/stages'
import { getProject, saveProject, subscribe } from '../lib/store'
import type { Project, StageId } from '../lib/types'
import { StudyJourney } from '../components/StudyJourney'
import { seedArchivedPlan, flowTitle } from '../lib/studyFlow'
import { StageShell } from '../stages/StageShell'
import { WorkspaceNavigator } from '../components/WorkspaceNavigator'
import { StageBoundary } from '../components/StageBoundary'
import './Workspace.css'

export function ProjectView({
  projectId,
  stageId,
}: {
  projectId: string
  stageId?: StageId
}) {
  const [project, setProject] = useState<Project | undefined>(() => getProject(projectId))

  useEffect(() => {
    setProject(getProject(projectId))
  }, [projectId])

  // Pick up store changes from cloud sync: a project that arrives after sign-in
  // (so a deep-link resolves once it's pulled), or a newer version edited on
  // another device. Guard on updatedAt so it never clobbers a local edit in
  // progress (local saves bump updatedAt, so fresh === current → no-op).
  useEffect(() => {
    return subscribe(() => {
      setProject((cur) => {
        const fresh = getProject(projectId)
        if (!fresh) return cur
        if (!cur) return fresh
        return fresh.updatedAt > cur.updatedAt ? fresh : cur
      })
    })
  }, [projectId])

  // resolve the active stage from the route, falling back to the project's current
  const active: StageId = useMemo(() => {
    if (stageId && STAGE_IDS.includes(stageId)) return stageId
    return project?.current ?? 'discover'
  }, [stageId, project?.current])

  // Tab title carries project + stage — with a few projects open in tabs,
  // the strip stays legible; reset on unmount so the hub gets its name back.
  useEffect(() => {
    if (project) {
      const stage = STAGES.find((s) => s.id === active)
      document.title = `${project.title.slice(0, 40)}${project.title.length > 40 ? '…' : ''} · ${stage?.title ?? ''} — Throughline Studio`
    }
    return () => {
      document.title = 'Throughline Studio — conduct research, A → Z'
    }
  }, [project, active])

  if (!project) {
    return (
      <main className="notfound" id="main">
        <p>That project could not be found.</p>
        <button className="btn btn-fill" onClick={() => navigate('/')}>
          <Icon name="back" size={15} /> Back to projects
        </button>
      </main>
    )
  }

  function patch(updater: (p: Project) => Project) {
    setProject((cur) => (cur ? saveProject(updater(cur)) : cur))
  }

  function pick(id: StageId) {
    const fresh = getProject(project!.id) || project!
    if (fresh.current !== id) setProject(saveProject({ ...fresh, current: id }))
    navigate(`/p/${project!.id}/${id}`)
  }

  /** Download the whole project as a JSON backup — the only copy lives in this
   *  browser while cloud sync is down, so give users a way out (import lives on
   *  the hub's projects shelf). */
  function exportProject() {
    const p = getProject(project!.id) || project!
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const slug = (p.title || 'project').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase()
    a.download = `${slug || 'project'}.throughline.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="workspace workspace-refined">
      <div className="ws-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <Icon name="back" size={14} /> Projects
        </button>
        <input
          className="ws-title-input"
          value={project.title}
          onChange={(e) => patch((p) => ({ ...p, title: e.target.value }))}
          aria-label="Project title"
        />
        {project.field && <span className="ws-field">{project.field}</span>}
        <WorkspaceNavigator project={project} onPick={pick} />
        {/* SYED-CONCEPT · Mission Control: evidence coverage — stages that
            actually carry artifacts (derived, never a vanity number) */}
        {(() => {
          const covered = STAGES.filter((s) => derivedStatus(project, s.id) !== 'todo').length
          if (!covered) return null
          const pct = Math.round((covered / STAGES.length) * 100)
          return (
            <span
              className="ws-coverage"
              title={`${covered} of ${STAGES.length} stages carry work (papers, hypotheses, scales, prereg, captures, drafts)`}
            >
              <span className="ws-coverage-ring" style={{ '--p': `${pct}%` } as CSSProperties} aria-hidden />
              {covered}/{STAGES.length} with work
            </span>
          )
        })()}
        <button
          className="btn btn-ghost btn-sm"
          onClick={exportProject}
          title="Download this project as a JSON backup — restore it via Import on the projects shelf"
        >
          <Icon name="publish" size={14} /> Export
        </button>
      </div>

      {/* a real, visible label — placeholders vanish the moment you type */}
      <label className="ws-q-label" htmlFor="ws-question">
        Research question <span className="ws-q-label-sub">— carried into every tool as the topic</span>
      </label>
      <input
        id="ws-question"
        className="ws-question"
        value={project.question}
        onChange={(e) => patch((p) => ({ ...p, question: e.target.value }))}
        placeholder="e.g. Does servant leadership raise team engagement?"
      />

      <StudyJourney project={project} onPick={pick} />
      {project.workingPaper && <details className="working-paper-source">
        <summary>Source archive · review, protocol and ethics documents</summary>
        <p>Saved source copies remain intact. Editable plans and study evidence stay together in this project. Changes here do not rewrite the archive.</p>
        <a href={project.workingPaper.url} target="_blank" rel="noopener noreferrer">Open original working paper ↗</a>
        {!project.workingPaper.planVersion && !project.stages.collect.data.preregLockedAt && <p><button className="btn btn-fill" onClick={() => patch(p => seedArchivedPlan(p))}>Fill empty plan fields from archive</button></p>}
        {project.workingPaper.documents.map(d => <details key={d.kind}><summary>{d.kind} · archived draft</summary><pre>{d.text}</pre></details>)}
      </details>}
      <details className="ws-evidence-drawer"><summary>Evidence carried through this study</summary><ThreadTray project={project} active={active} onPick={pick} /></details>

      <div className="ws-mobile-stage"><label htmlFor="workspace-stage-select">Current stage</label><select id="workspace-stage-select" value={active} onChange={e => pick(e.target.value as StageId)}>{STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.n}. {flowTitle(project, stage.id)}</option>)}</select></div>

      <div className="ws-body">
        <Spine project={project} activeStage={active} onPick={pick} />
        <main className="ws-stage" id="main">
          <StageBoundary key={`${project.id}:${active}`}><StageShell
            key={`${active}:${project.workingPaper?.planVersion || 0}`}
            project={project}
            stageId={active}
            onChange={(p) => setProject(p)}
            onPick={pick}
          /></StageBoundary>
        </main>
      </div>
    </div>
  )
}

/** The carry, embodied: a persistent strip of what every stage has actually
 *  accumulated — visible from anywhere on the spine, each chip a jump. This is
 *  the throughline as a thing you can see and touch, not a metaphor in copy. */
function ThreadTray({
  project,
  active,
  onPick,
}: {
  project: Project
  active: StageId
  onPick: (id: StageId) => void
}) {
  const items = STAGES.map((s) => ({ s, carry: carrySummary(project, s.id) })).filter(
    (x): x is { s: (typeof STAGES)[number]; carry: string } => x.carry !== null,
  )
  if (items.length === 0) return <p className="ws-evidence-empty">Saved papers, plans, analysis captures and manuscript sections will appear here as you work.</p>
  return (
    <div className="thread-tray" role="navigation" aria-label="What the thread carries so far">
      <span className="thread-tray-label">
        <Icon name="arrow" size={12} /> the thread
      </span>
      {items.map(({ s, carry }, i) => (
        <Fragment key={s.id}>
          {i > 0 && (
            <span className="thread-tray-sep" aria-hidden="true">
              →
            </span>
          )}
          <button
            className={`thread-tray-chip ${s.id === active ? 'is-here' : ''}`}
            onClick={() => onPick(s.id)}
            title={`${s.title}: ${carry}`}
          >
            <b>{flowTitle(project, s.id)}</b> · {carry}
          </button>
        </Fragment>
      ))}
    </div>
  )
}
