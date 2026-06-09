// ============================================================================
// Throughline Studio — project workspace.
// The spine on the left, the active stage workspace on the right. The header
// carries the editable title + research question (the question is the topic
// that deep-links into every tool).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Spine } from '../components/Spine'
import { navigate } from '../lib/router'
import { STAGE_IDS } from '../lib/stages'
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
      </div>

      <input
        className="ws-question"
        value={project.question}
        onChange={(e) => patch((p) => ({ ...p, question: e.target.value }))}
        placeholder="Your research question — carried into every tool as the topic…"
        aria-label="Research question"
      />

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
