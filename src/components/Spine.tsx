// ============================================================================
// Throughline Studio — the spine. A vertical thread (A → Z) with one node per
// stage, status-aware, clickable to jump into a stage workspace. This is the
// product's signature: the single line that runs the whole way through.
// ============================================================================

import { STAGES } from '../lib/stages'
import type { Project, StageId } from '../lib/types'
import { Icon } from './Icon'

export function Spine({
  project,
  activeStage,
  onPick,
}: {
  project: Project
  activeStage: StageId
  onPick: (id: StageId) => void
}) {
  return (
    <nav className="spine" aria-label="Research stages">
      <div className="spine-cap spine-cap-a" aria-hidden="true">
        A
      </div>
      <ol className="spine-list">
        {STAGES.map((s) => {
          const st = project.stages[s.id]?.status ?? 'todo'
          const isActive = s.id === activeStage
          return (
            <li key={s.id} className={`spine-item is-${st} ${isActive ? 'is-current' : ''}`}>
              <button
                className="spine-node-btn"
                onClick={() => onPick(s.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="spine-node" aria-hidden="true">
                  {st === 'done' ? <Icon name="check" size={13} /> : s.n}
                </span>
                <span className="spine-meta">
                  <span className="spine-title">{s.title}</span>
                  <span className="spine-brief">{s.brief}</span>
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
