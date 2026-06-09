// ============================================================================
// Throughline Studio — core domain types.
// A research Project is the spine; it advances through the seven lifecycle
// stages (discover → publish). Each stage owns a free-form `data` bag that the
// stage workspaces grow into; `status` + `notes` are shared across all stages.
// ============================================================================

export type StageId =
  | 'discover'
  | 'frame'
  | 'measure'
  | 'collect'
  | 'analyze'
  | 'write'
  | 'publish'

export type StageStatus = 'todo' | 'active' | 'done'

export interface StageState {
  status: StageStatus
  notes: string
  updatedAt: number
  /** stage-specific working state — filled in as each workspace is built out */
  data: Record<string, unknown>
}

export interface Project {
  id: string
  title: string
  /** discipline / domain, e.g. "Organizational Behavior" */
  field: string
  /** refined research question — authored in the Frame stage */
  question: string
  createdAt: number
  updatedAt: number
  /** the stage the researcher is currently on */
  current: StageId
  stages: Record<StageId, StageState>
}
