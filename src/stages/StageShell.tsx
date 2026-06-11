// ============================================================================
// Throughline Studio — stage workspace shell.
// Header + per-stage body + shared sidebar (carries / status / next).
// Every stage now has an embedded workspace; the body is dispatched by id.
// Notes + status are shared across all stages.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { readingList } from '../lib/corpus'
import { STAGES, stageDef } from '../lib/stages'
import { setStageNotes, setStageStatus } from '../lib/store'
import type { Project, StageId, StageStatus } from '../lib/types'
import { AnalyzeBody } from './AnalyzeBody'
import { CollectBody } from './CollectBody'
import { DiscoverBody } from './DiscoverBody'
import { FrameBody } from './FrameBody'
import { MeasureBody } from './MeasureBody'
import { PublishBody } from './PublishBody'
import { WriteBody } from './WriteBody'

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
  const def = stageDef(stageId)
  const state = project.stages[stageId]
  const topic = project.question.trim() || project.title.trim()

  // notes: local state, debounced persist
  const [notes, setNotes] = useState(state.notes)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    setNotes(state.notes)
  }, [stageId, state.notes])

  function onNotes(v: string) {
    setNotes(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onChange(setStageNotes(project, stageId, v))
    }, 400)
  }

  const idx = STAGES.findIndex((s) => s.id === stageId)
  const next = STAGES[idx + 1]
  const carrySub = carryLabel(project, stageId)

  const Body =
    stageId === 'discover'
      ? DiscoverBody
      : stageId === 'frame'
        ? FrameBody
        : stageId === 'measure'
          ? MeasureBody
          : stageId === 'collect'
            ? CollectBody
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
          <StatusPill status={state.status} />
        </div>
        <h1 id="stage-title" className="stage-title">
          <Icon name={def.id} size={26} /> {def.title}
          <span className="stage-verb">— {def.verb.toLowerCase()}</span>
        </h1>
        <p className="stage-blurb">{def.blurb}</p>
      </header>

      <div className="stage-grid">
        <div className="stage-main">
          <Body project={project} onChange={onChange} topic={topic} />

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

          <div className="side-card">
            <h3 className="side-h3">Stage status</h3>
            <div className="status-btns">
              <button
                className={`btn btn-ghost ${state.status === 'active' ? 'is-on' : ''}`}
                onClick={() => onChange(setStageStatus(project, stageId, 'active'))}
              >
                <Icon name="dot" size={14} /> Working
              </button>
              <button
                className={`btn btn-fill ${state.status === 'done' ? 'is-on' : ''}`}
                onClick={() => onChange(setStageStatus(project, stageId, 'done'))}
              >
                <Icon name="check" size={14} /> Done
              </button>
            </div>
          </div>

          {next && (
            <button className="btn btn-next" onClick={() => onPick(next.id)}>
              Next: {next.title} <Icon name="arrow" size={15} />
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

/** Sidebar sub-line showing what each stage has accumulated so far. */
function carryLabel(p: Project, stageId: StageId): string | null {
  const data = (s: StageId) => (p.stages[s]?.data || {}) as Record<string, unknown>
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0)
  switch (stageId) {
    case 'discover': {
      const n = readingList(p).length
      return n ? `${n} ${n === 1 ? 'paper' : 'papers'} in the reading list` : null
    }
    case 'frame': {
      const f = data('frame')
      const hyps = count(f.hypotheses)
      const parts = [f.theory ? '1 lens' : null, hyps ? `${hyps} hypotheses` : null].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'measure': {
      const n = count(data('measure').scales)
      return n ? `${n} ${n === 1 ? 'scale' : 'scales'} in the instrument` : null
    }
    case 'collect': {
      const s = data('collect').status as string | undefined
      return s && s !== 'Not started' ? s.toLowerCase() : null
    }
    case 'analyze': {
      const n = count(data('analyze').captures)
      return n ? `${n} ${n === 1 ? 'result' : 'results'} captured` : null
    }
    case 'write': {
      const w = data('write')
      const filled = ['abstract', 'intro', 'methods', 'results', 'discussion'].filter(
        (k) => typeof w[k] === 'string' && (w[k] as string).trim(),
      ).length
      return filled ? `${filled} ${filled === 1 ? 'section' : 'sections'} drafted` : null
    }
    case 'publish': {
      const pb = data('publish')
      const done = ['preregistered', 'dataShared', 'materialsShared', 'openAccess'].filter((k) => pb[k]).length
      return done ? `${done}/4 open-science checks` : null
    }
  }
}
