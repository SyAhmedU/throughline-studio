// ============================================================================
// Throughline Studio — the spine. A vertical thread (A → Z) with one node per
// stage, status-aware, clickable to jump into a stage workspace. This is the
// product's signature: the single line that runs the whole way through.
// ============================================================================

import type { CSSProperties } from 'react'
import { flowTitle, reviewed, isMetaStudy } from '../lib/studyFlow'
import { derivedStatus } from '../lib/artifacts'
import { STAGES } from '../lib/stages'
import type { Project, StageId } from '../lib/types'
import { Icon } from './Icon'
import { warmStage } from '../lib/stageLoaders'

export function Spine({
  project,
  activeStage,
  onPick,
}: {
  project: Project
  activeStage: StageId
  onPick: (id: StageId) => void
}) {
  // the thread fills down to the furthest completed stage — progress made visible
  const lastDone = STAGES.reduce(
    (acc, s, i) => (reviewed(project, s.id) ? i : acc),
    -1,
  )
  const fill = lastDone < 0 ? 0 : ((lastDone + 0.5) / STAGES.length) * 100

  return (
    <nav className="spine" aria-label="Research stages">
      <div className="spine-cap spine-cap-a" aria-hidden="true">
        A
      </div>
      <ol className="spine-list" style={{ '--spine-fill': `${fill}%` } as CSSProperties}>
        {STAGES.map((s) => {
          const st = derivedStatus(project, s.id)
          const isActive = s.id === activeStage
          return (
            <li key={s.id} className={`spine-item is-${st} ${isActive ? 'is-current' : ''}`}>
              <button
                className="spine-node-btn"
                onClick={() => onPick(s.id)}
                onPointerEnter={() => warmStage(s.id)}
                onFocus={() => warmStage(s.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="spine-node" aria-hidden="true">
                  {st === 'done' ? <Icon name="check" size={13} /> : s.n}
                </span>
                <span className="spine-meta">
                  <span className="spine-title">{flowTitle(project, s.id)}</span>
                  <span className="spine-brief">{isMetaStudy(project) && s.id === 'measure' ? 'Coding rules & reliability' : isMetaStudy(project) && s.id === 'collect' ? 'Article sampling & screening' : s.brief}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="spine-cap spine-cap-z" aria-hidden="true">
        Z
      </div>
    </nav>
  )
}
