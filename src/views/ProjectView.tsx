// ============================================================================
// Throughline Studio — project workspace.
// The spine on the left, the active stage workspace on the right. The header
// carries the editable title + research question (the question is the topic
// that deep-links into every tool).
// ============================================================================

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Spine } from '../components/Spine'
import { carrySummary } from '../lib/artifacts'
import { navigate } from '../lib/router'
import { STAGE_IDS, STAGES } from '../lib/stages'
import { getProject, saveProject, subscribe } from '../lib/store'
import type { Project, StageId } from '../lib/types'
import { StageShell } from '../stages/StageShell'

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
      <div className="notfound">
        <p>That project could not be found.</p>
        <button className="btn btn-fill" onClick={() => navigate('/')}>
          <Icon name="back" size={15} /> Back to projects
        </button>
      </div>
    )
  }

  function patch(updater: (p: Project) => Project) {
    setProject((cur) => (cur ? saveProject(updater(cur)) : cur))
  }

  function pick(id: StageId) {
    navigate(`/p/${project!.id}/${id}`)
  }

  /** Download the whole project as a JSON backup — the only copy lives in this
   *  browser while cloud sync is down, so give users a way out (import lives on
   *  the hub's projects shelf). */
  function exportProject() {
    const p = project!
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const slug = (p.title || 'project').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase()
    a.download = `${slug || 'project'}.throughline.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="workspace">
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

      <ThreadTray project={project} active={active} onPick={pick} />

      <div className="ws-body">
        <Spine project={project} activeStage={active} onPick={pick} />
        <main className="ws-stage" id="main">
          <StageShell
            key={active}
            project={project}
            stageId={active}
            onChange={(p) => setProject(p)}
            onPick={pick}
          />
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
  if (items.length === 0) return null
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
            <b>{s.title}</b> · {carry}
          </button>
        </Fragment>
      ))}
    </div>
  )
}
