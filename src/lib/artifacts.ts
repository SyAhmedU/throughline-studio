// ============================================================================
// Throughline Studio — artifact-derived stage progress.
// A stage is "in progress" because it HAS something (papers saved, hypotheses
// written, a locked prereg, captured results) — not because the user flipped a
// pill. "Done" stays a human judgment (research stages don't finish by count),
// so the manual done flag wins; everything below it is derived.
// ============================================================================

import { readingList } from './corpus'
import type { Project, StageId, StageStatus } from './types'

/** One line summarising what a stage has accumulated — null when empty. */
export function carrySummary(p: Project, stageId: StageId): string | null {
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
      const c = data('collect')
      const status =
        typeof c.status === 'string' && c.status !== 'Not started' ? (c.status as string).toLowerCase() : null
      const parts = [c.preregLockedAt ? 'prereg locked' : null, status].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
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

/** Manual 'done' wins; otherwise 'active' the moment real artifacts exist. */
export function derivedStatus(p: Project, stageId: StageId): StageStatus {
  const manual = p.stages[stageId]?.status ?? 'todo'
  if (manual === 'done') return 'done'
  if (carrySummary(p, stageId) !== null) return 'active'
  return manual
}
