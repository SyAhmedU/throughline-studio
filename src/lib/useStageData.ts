// ============================================================================
// Throughline Studio — debounced per-stage form state.
// Holds a stage's `data` bag in local state for snappy typing, then persists it
// (debounced) via setStageData. Stage workspaces are remounted on stage change
// (ProjectView keys StageShell by stage), so local always re-initialises from
// the stored data — no external-sync effect needed.
// ============================================================================

import { useRef, useState } from 'react'
import { setStageData } from './store'
import type { Project, StageId } from './types'

export function useStageData<T extends Record<string, unknown>>(
  project: Project,
  stageId: StageId,
  onChange: (p: Project) => void,
): [T, (patch: Partial<T>) => void] {
  const [local, setLocal] = useState<T>((project.stages[stageId].data || {}) as T)
  const timer = useRef<number | undefined>(undefined)
  const projRef = useRef(project)
  projRef.current = project

  function update(patch: Partial<T>) {
    const next = { ...local, ...patch } as T
    setLocal(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onChange(setStageData(projRef.current, stageId, next))
    }, 350)
  }

  return [local, update]
}
