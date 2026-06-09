// ============================================================================
// Throughline Studio — local persistence (localStorage).
// Projects live under `tls_projects`; the last-opened project id under
// `tls_active`. No server: a research project is fully owned by the browser
// (matches the suite's other client-first tools). All access is fault-tolerant.
// ============================================================================

import type { Project, StageId, StageState, StageStatus } from './types'
import { STAGES } from './stages'

const KEY = 'tls_projects'
const ACTIVE = 'tls_active'

function now(): number {
  return Date.now()
}

function emptyStage(status: StageStatus): StageState {
  return { status, notes: '', updatedAt: now(), data: {} }
}

function blankStages(): Project['stages'] {
  const out = {} as Project['stages']
  STAGES.forEach((s, i) => {
    out[s.id] = emptyStage(i === 0 ? 'active' : 'todo')
  })
  return out
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as Project[]) : []
  } catch {
    return []
  }
}

function persist(list: Project[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* quota / private mode — keep working in memory for this session */
  }
}

export function getProject(id: string): Project | undefined {
  return loadProjects().find((p) => p.id === id)
}

export function createProject(title: string, field: string): Project {
  const ts = now()
  const p: Project = {
    id: 'p_' + ts.toString(36) + Math.random().toString(36).slice(2, 6),
    title: title.trim() || 'Untitled study',
    field: field.trim(),
    question: '',
    createdAt: ts,
    updatedAt: ts,
    current: 'discover',
    stages: blankStages(),
  }
  const list = loadProjects()
  list.unshift(p)
  persist(list)
  setActive(p.id)
  return p
}

export function saveProject(p: Project): Project {
  const next = { ...p, updatedAt: now() }
  const list = loadProjects()
  const i = list.findIndex((x) => x.id === next.id)
  if (i >= 0) list[i] = next
  else list.unshift(next)
  persist(list)
  return next
}

export function deleteProject(id: string): void {
  persist(loadProjects().filter((p) => p.id !== id))
  if (getActive() === id) clearActive()
}

/** Update a single stage's status and return the saved project. */
export function setStageStatus(p: Project, id: StageId, status: StageStatus): Project {
  const stages = { ...p.stages, [id]: { ...p.stages[id], status, updatedAt: now() } }
  const current = status === 'active' ? id : p.current
  return saveProject({ ...p, current, stages })
}

/** Update a single stage's notes and return the saved project. */
export function setStageNotes(p: Project, id: StageId, notes: string): Project {
  const stages = { ...p.stages, [id]: { ...p.stages[id], notes, updatedAt: now() } }
  return saveProject({ ...p, stages })
}

/** Replace a stage's free-form data bag and return the saved project. */
export function setStageData(p: Project, id: StageId, data: Record<string, unknown>): Project {
  const stages = { ...p.stages, [id]: { ...p.stages[id], data, updatedAt: now() } }
  return saveProject({ ...p, stages })
}

// ── active-project pointer ────────────────────────────────────────────────
export function getActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE)
  } catch {
    return null
  }
}
export function setActive(id: string): void {
  try {
    localStorage.setItem(ACTIVE, id)
  } catch {
    /* ignore */
  }
}
export function clearActive(): void {
  try {
    localStorage.removeItem(ACTIVE)
  } catch {
    /* ignore */
  }
}

/** Fraction of stages marked done (0..1) — drives the spine progress fill. */
export function progress(p: Project): number {
  const done = STAGES.filter((s) => p.stages[s.id]?.status === 'done').length
  return done / STAGES.length
}
