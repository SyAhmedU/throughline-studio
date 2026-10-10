// ============================================================================
// Throughline Studio — stage workspace shell.
// Header + per-stage body + shared sidebar (carries / status / next).
// Every stage now has an embedded workspace; the body is dispatched by id.
// Notes + status are shared across all stages.
// ============================================================================

import { lazy, Suspense, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { carrySummary, derivedStatus } from '../lib/artifacts'
import { STAGES, stageDef } from '../lib/stages'
import { Checkpoint, StudyContext } from '../components/StudyJourney'
import { flowTitle, isMetaStudy } from '../lib/studyFlow'
import { getProject, setStageNotes } from '../lib/store'
import type { Project, StageId, StageStatus } from '../lib/types'

// Each stage body is its own chunk: they carry heavy stage-specific libs
// (Analyze → the verbatim ToolsScope stats engine, Discover → the corpus
// layer, Measure → the scale catalog) that shouldn't weigh down the hub or
// each other. Same-origin chunk fetches resolve in ms; the stage-grid enter
// animation absorbs the swap.
const AnalyzeBody = lazy(() => import('./AnalyzeBody').then((m) => ({ default: m.AnalyzeBody })))
const CollectBody = lazy(() => import('./CollectBody').then((m) => ({ default: m.CollectBody })))
const DiscoverBody = lazy(() => import('./DiscoverBody').then((m) => ({ default: m.DiscoverBody })))
const FrameBody = lazy(() => import('./FrameBody').then((m) => ({ default: m.FrameBody })))
const MeasureBody = lazy(() => import('./MeasureBody').then((m) => ({ default: m.MeasureBody })))
const PublishBody = lazy(() => import('./PublishBody').then((m) => ({ default: m.PublishBody })))
const WriteBody = lazy(() => import('./WriteBody').then((m) => ({ default: m.WriteBody })))

const MetaCollectBody = lazy(() => import('./MetaCollectBody').then(m => ({ default: m.MetaCollectBody })))
const NoBody = () => null

export function StageShell({
  project,
  stageId,
  onChange,
  onPick,
}: {
  project: Project
  stageId: StageId
  onChange: (p: Project) => void
  onPick: (id: StageId) => void
}) {
  const def = { ...stageDef(stageId), title: flowTitle(project, stageId) }
  if (isMetaStudy(project) && stageId === 'measure') Object.assign(def, { verb: 'Define the codes', brief: 'Coding rules & reliability', blurb: 'Operationalise the coding manual and document the pilot and coder arrangements.', carries: 'a coding manual and agreement plan' })
  if (isMetaStudy(project) && stageId === 'collect') Object.assign(def, { verb: 'Assemble the evidence', brief: 'Article sampling & screening', blurb: 'Record search and eligibility rules, readiness evidence and screening decisions.', carries: 'a screened article set and coding protocol' })
  const state = project.stages[stageId]
  const topic = project.question.trim() || project.title.trim()

  // Persist notes immediately, including when navigating to the next step.
  const [notes, setNotes] = useState(state.notes)
  useEffect(() => {
    setNotes(state.notes)
  }, [stageId, state.notes])

  function onNotes(v: string) {
    setNotes(v)
    onChange(setStageNotes(getProject(project.id) || project, stageId, v))
  }

  const idx = STAGES.findIndex((s) => s.id === stageId)
  const next = STAGES[idx + 1]
  const carrySub = carrySummary(project, stageId)
  const shown = derivedStatus(project, stageId)

  const Body =
    stageId === 'discover'
      ? DiscoverBody
      : stageId === 'frame'
        ? FrameBody
        : stageId === 'measure'
          ? isMetaStudy(project) ? NoBody : MeasureBody
          : stageId === 'collect'
            ? isMetaStudy(project) ? MetaCollectBody : CollectBody
            : stageId === 'analyze'
              ? AnalyzeBody
              : stageId === 'write'
                ? WriteBody
                : PublishBody

  return (
    <section className="stage" aria-labelledby="stage-title" data-stage-n={def.n}>
      <header className="stage-head" key={stageId} data-n={String(def.n).padStart(2, '0')}>
        <div className="stage-eyebrow">
          <span className="stage-num">{String(def.n).padStart(2, '0')}</span>
          <span className="stage-brief-tag">{def.brief}</span>
          <StatusPill status={shown} />
        </div>
        <h1 id="stage-title" className="stage-title">
          <Icon name={def.id} size={26} /> {def.title}
          <span className="stage-verb">— {def.verb.toLowerCase()}</span>
        </h1>
        {/* the explainer earns its place only on a first visit — once the stage
            has artifacts the user knows what it's for, so reclaim the space */}
        {shown === 'todo' && <p className="stage-blurb">{def.blurb}</p>}
      </header>

      <div className="stage-grid">
        <div className="stage-main">
          <StudyContext project={project} stage={stageId} onChange={onChange} />
          <Suspense fallback={null}>
            <Body project={project} onChange={onChange} topic={topic} />
          </Suspense>

          <label className="notes-label" htmlFor="stage-notes">
            Working notes
          </label>
          <textarea
            id="stage-notes"
            className="notes"
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder={`What did you decide at the ${def.title} stage? Findings, links, choices…`}
            rows={5}
          />
        </div>

        <aside className="stage-side">
          <div className="side-card">
            <h3 className="side-h3">Carries forward</h3>
            <p className="side-carry">
              <Icon name="arrow" size={15} /> {def.carries}
            </p>
            {carrySub && <p className="side-carry-sub">{carrySub}</p>}
          </div>

          <Checkpoint project={project} stage={stageId} onChange={onChange} onPick={onPick} />

          {next && (
            <button className="btn btn-next" onClick={() => onPick(next.id)}>
              Next: {flowTitle(project, next.id)} <Icon name="arrow" size={15} />
            </button>
          )}
        </aside>
      </div>
    </section>
  )
}

function StatusPill({ status }: { status: StageStatus }) {
  const label = status === 'done' ? 'Done' : status === 'active' ? 'In progress' : 'Not started'
  return <span className={`status-pill is-${status}`}>{label}</span>
}
