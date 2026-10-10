import { reviewed } from './studyFlow.ts'
import { isProject } from './backup.ts'
// ============================================================================
// Throughline Studio — local persistence (localStorage).
// Projects live under `tls_projects`; the last-opened project id under
// `tls_active`. No server: a research project is fully owned by the browser
// (matches the suite's other client-first tools). All access is fault-tolerant.
// ============================================================================

import type { Project, StageId, StageState, StageStatus } from './types'
import { STAGES } from './stages.ts'

const KEY = 'tls_projects'
const ACTIVE = 'tls_active'
let sessionProjects: Project[] = []
let pendingSave = false
let storageIssue: 'read' | 'write' | 'invalid' | null = null
let unreadableBackup: string | null = null
export const getStorageIssue = () => storageIssue
export const hasUnsavedWork = () => pendingSave
export const getUnreadableBackup = () => unreadableBackup
function setStorageIssue(issue: typeof storageIssue): void {
  if (storageIssue !== issue) { storageIssue = issue; emit() }
}

function now(): number {
  return Date.now()
}

// ── cloud-sync seam ─────────────────────────────────────────────────────────
// The store stays the single source of truth and works fully offline. When a
// user signs in, sync.ts registers a sink here: every local write is mirrored
// up to the cloud, and subscribers (the views) are notified so pulled-down
// projects appear. Both are no-ops until wired, so the store never depends on
// the network.
export interface StoreSink {
  push(p: Project): void
  remove(id: string): void
}
let sink: StoreSink | null = null
export function setSink(s: StoreSink | null): void {
  sink = s
}

const subscribers = new Set<() => void>()
export function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}
function emit(): void {
  // Defer so subscribers never run inside the setState/updater that triggered
  // the write (avoids nested-render warnings and cursor jumps in inputs).
  queueMicrotask(() => {
    subscribers.forEach((cb) => {
      try {
        cb()
      } catch {
        /* a bad subscriber must not break persistence */
      }
    })
  })
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
  if (pendingSave) return structuredClone(sessionProjects)
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    setStorageIssue('read')
    return structuredClone(sessionProjects)
  }
  try {
    const arr: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr) || !arr.every(isProject)) throw new Error('Invalid saved workspace')
    sessionProjects = arr
    unreadableBackup = null
    setStorageIssue(null)
  } catch {
    unreadableBackup = raw
    setStorageIssue('invalid')
  }
  return structuredClone(sessionProjects)
}

function persist(list: Project[]): void {
  sessionProjects = structuredClone(list)
  pendingSave = true
  // Never replace unreadable/invalid stored work with an apparently empty shelf.
  if (storageIssue === 'read' || storageIssue === 'invalid') { emit(); return }
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    pendingSave = false
    setStorageIssue(null)
  } catch {
    setStorageIssue('write')
  }
  emit()
}

export function retrySave(): void {
  if (storageIssue === 'write') persist(sessionProjects)
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
  sink?.push(p)
  return p
}

export function saveProject(p: Project): Project {
  const next = { ...p, updatedAt: now() }
  const list = loadProjects()
  const i = list.findIndex((x) => x.id === next.id)
  if (i >= 0) list[i] = next
  else list.unshift(next)
  persist(list)
  sink?.push(next)
  return next
}

export function deleteProject(id: string): void {
  persist(loadProjects().filter((p) => p.id !== id))
  if (getActive() === id) clearActive()
  sink?.remove(id)
}

/**
 * Merge cloud projects into the local store, last-write-wins by `updatedAt`.
 * Deliberately does NOT notify the sink — these writes originate FROM the
 * cloud, so re-pushing them would loop. Persisting emits a change so the views
 * refresh. Returns the projects that exist only locally; the caller pushes
 * those up so a device's pre-sign-in work isn't lost.
 */
export function mergeRemote(remote: Project[]): { localOnly: Project[] } {
  const local = loadProjects()
  const byId = new Map(local.map((p) => [p.id, p] as const))
  const remoteIds = new Set(remote.map((p) => p.id))
  let changed = false
  for (const rp of remote) {
    const lp = byId.get(rp.id)
    if (!lp || rp.updatedAt > lp.updatedAt) {
      byId.set(rp.id, rp)
      changed = true
    }
  }
  const localOnly = local.filter((p) => !remoteIds.has(p.id))
  if (changed) {
    const merged = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    persist(merged)
  }
  return { localOnly }
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
  const done = STAGES.filter((s) => reviewed(p, s.id)).length
  return done / STAGES.length
}
