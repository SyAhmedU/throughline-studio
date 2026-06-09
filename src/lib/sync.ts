// ============================================================================
// Throughline Studio — cloud sync controller.
// Mirrors the local project store (store.ts) to the suite `projects` table so a
// signed-in researcher's projects follow them across devices. The local store
// stays the source of truth; this layer just keeps the cloud in step.
//
// Strategy: last-write-wins by Project.updatedAt (the suite's convention). The
// local map `tls_cloud_map` ties each local project id to its suite row uuid so
// updates land on the right row. Cross-device identity is the Project.id itself
// (it travels inside the stored blob), so the same study keeps one identity
// everywhere; the row uuid is just its storage address on each device.
//
// Lifecycle (driven by useCloudSync):
//   start(userId): register as the store's write sink, pull the cloud, merge it
//     into local (LWW), then push any local-only projects up.
//   stop(): unregister the sink. Local data is kept; the app stays fully usable.
//
// Signed-out / preview (no Supabase) => never started; the store is local-only.
// ============================================================================

import { deleteRow, fetchRows, upsertRow } from './cloud'
import { mergeRemote, setSink } from './store'
import type { Project } from './types'

const MAP_KEY = 'tls_cloud_map'
const PUSH_DEBOUNCE = 1000

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'
type Listener = (s: SyncStatus) => void

let userId: string | null = null
let active = false
let status: SyncStatus = 'idle'
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pending = new Map<string, Project>()
const listeners = new Set<Listener>()

function setStatus(s: SyncStatus): void {
  status = s
  listeners.forEach((l) => {
    try {
      l(s)
    } catch {
      /* ignore */
    }
  })
}
export function getStatus(): SyncStatus {
  return status
}
export function onStatus(l: Listener): () => void {
  listeners.add(l)
  l(status)
  return () => {
    listeners.delete(l)
  }
}

// ── row-id map (projectId -> suite row uuid) ───────────────────────────────
function loadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveMap(m: Record<string, string>): void {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}
function rowIdFor(pid: string): string | null {
  return loadMap()[pid] ?? null
}
function setRowId(pid: string, rowId: string): void {
  const m = loadMap()
  m[pid] = rowId
  saveMap(m)
}
function dropRowId(pid: string): void {
  const m = loadMap()
  delete m[pid]
  saveMap(m)
}

// ── the store sink (ongoing writes) ────────────────────────────────────────
const sink = {
  push(p: Project) {
    queuePush(p)
  },
  remove(id: string) {
    void removeNow(id)
  },
}

function queuePush(p: Project): void {
  if (!active) return
  pending.set(p.id, p)
  const existing = pushTimers.get(p.id)
  if (existing) clearTimeout(existing)
  pushTimers.set(
    p.id,
    setTimeout(() => {
      void flushOne(p.id)
    }, PUSH_DEBOUNCE),
  )
}

async function flushOne(pid: string): Promise<void> {
  pushTimers.delete(pid)
  const p = pending.get(pid)
  if (!p || !userId) return
  pending.delete(pid)
  setStatus('syncing')
  try {
    const rowId = await upsertRow(rowIdFor(pid), p, userId)
    setRowId(pid, rowId)
    setStatus(pending.size ? 'syncing' : 'synced')
  } catch {
    setStatus('error')
  }
}

async function removeNow(pid: string): Promise<void> {
  if (!active) return
  pending.delete(pid)
  const t = pushTimers.get(pid)
  if (t) {
    clearTimeout(t)
    pushTimers.delete(pid)
  }
  const rowId = rowIdFor(pid)
  if (!rowId) return
  setStatus('syncing')
  try {
    await deleteRow(rowId)
    dropRowId(pid)
    setStatus('synced')
  } catch {
    setStatus('error')
  }
}

// ── pull + merge + reconcile ───────────────────────────────────────────────
// Shared by start() (on sign-in) and refresh() (on tab focus). Pulls the
// cloud, merges it into local last-write-wins (never overwriting a locally
// newer project), and pushes any local-only projects up.
async function pullMergePush(uid: string): Promise<void> {
  setStatus('syncing')
  try {
    const rows = await fetchRows()
    // Learn row ids for everything the cloud already has.
    const map = loadMap()
    for (const r of rows) map[r.project.id] = r.id
    saveMap(map)
    // Merge cloud -> local (LWW); collect projects that exist only locally.
    const { localOnly } = mergeRemote(rows.map((r) => r.project))
    // Push local-only projects up (first sync from a device with prior work).
    for (const p of localOnly) {
      try {
        const rowId = await upsertRow(rowIdFor(p.id), p, uid)
        setRowId(p.id, rowId)
      } catch {
        /* leave it local; a later edit will retry */
      }
    }
    setStatus(pending.size ? 'syncing' : 'synced')
  } catch {
    setStatus('error')
  }
}

// ── lifecycle ──────────────────────────────────────────────────────────────
export async function start(uid: string): Promise<void> {
  // Reset any state from a previous session/account before re-arming.
  pushTimers.forEach((t) => clearTimeout(t))
  pushTimers.clear()
  pending.clear()
  userId = uid
  active = true
  setSink(sink)
  await pullMergePush(uid)
}

/**
 * Re-pull the cloud and merge it in (e.g. when the tab regains focus), so a
 * project edited on another device shows up without a reload. Safe mid-session:
 * the LWW merge never replaces a project whose local copy is newer, and it
 * leaves debounced pending pushes untouched. No-op unless sync is running.
 */
export async function refresh(): Promise<void> {
  if (!active || !userId) return
  await pullMergePush(userId)
}

export function stop(): void {
  active = false
  userId = null
  setSink(null)
  pushTimers.forEach((t) => clearTimeout(t))
  pushTimers.clear()
  pending.clear()
  setStatus('idle')
}

/** Best-effort flush of any debounced pushes (e.g. on tab close / hide). */
export function flushPending(): void {
  pushTimers.forEach((_t, pid) => {
    clearTimeout(_t)
    void flushOne(pid)
  })
}
