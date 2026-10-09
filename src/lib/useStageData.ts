// ============================================================================
// Throughline Studio — per-stage form state with immediate local persistence.
// Save each edit before returning so reload, navigation and export cannot lose
// pending text. Cloud pushes are separately debounced in sync.ts.
// Stage workspaces are remounted on stage change
// (ProjectView keys StageShell by stage), so local always re-initialises from
// the stored data — no external-sync effect needed.
// ============================================================================

import { useRef, useState } from 'react'
import { getProject, setStageData } from './store'
import type { Project, StageId } from './types'

export function useStageData<T extends Record<string, unknown>>(
  project: Project,
  stageId: StageId,
  onChange: (p: Project) => void,
): [T, (patch: Partial<T>) => void] {
  const [local, setLocal] = useState<T>((project.stages[stageId].data || {}) as T)
  const localRef = useRef(local)
  const projRef = useRef(project)
  projRef.current = project

  function update(patch: Partial<T>) {
    const next = { ...localRef.current, ...patch } as T
    localRef.current = next
    setLocal(next)
    onChange(setStageData(getProject(project.id) || projRef.current, stageId, next))
  }

  return [local, update]
}
