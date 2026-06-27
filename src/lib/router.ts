// ============================================================================
// Throughline Studio — tiny hash router (zero deps).
// Routes:  #/                  → hub
//          #/p/<id>            → project workspace (current stage)
//          #/p/<id>/<stageId>  → project workspace focused on a stage
//          #/examples          → worked-examples gallery
//          #/examples/<slug>   → one worked example (case study)
//          #/map               → verified knowledge graph
//          #/map/<code>        → one construct's connected thread
// ============================================================================

import { useSyncExternalStore } from 'react'
import type { StageId } from './types'

function currentHash(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Subscribe a component to the current hash path. */
export function useHash(): string {
  return useSyncExternalStore(subscribe, currentHash, () => '/')
}

export function navigate(to: string): void {
  const path = to.startsWith('#') ? to : '#' + to
  if (window.location.hash === path) return
  window.location.hash = path
  // hashchange doesn't fire when the hash is identical apart from leading '#';
  // the guard above already handled the no-op case, so this is safe.
}

export interface Route {
  name: 'hub' | 'project' | 'examples' | 'graph'
  projectId?: string
  stageId?: StageId
  /** case-study slug for #/examples/<slug> */
  slug?: string
  /** construct code for #/map/<code> */
  code?: string
}

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^\/+/, '').split('/').filter(Boolean)
  if (parts[0] === 'p' && parts[1]) {
    return { name: 'project', projectId: parts[1], stageId: parts[2] as StageId | undefined }
  }
  if (parts[0] === 'examples') {
    return { name: 'examples', slug: parts[1] }
  }
  if (parts[0] === 'map') {
    return { name: 'graph', code: parts[1] }
  }
  return { name: 'hub' }
}
