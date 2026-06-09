// ============================================================================
// Throughline Studio — cloud sync hook.
// Binds the sync controller (sync.ts) to the auth lifecycle: start it when a
// user is signed in, stop it on sign-out. Flushes pending pushes when the tab
// is hidden or closed so a quick edit-then-close still lands in the cloud.
// Mount once, at the app root.
// ============================================================================

import { useEffect, useState } from 'react'
import { flushPending, getStatus, onStatus, refresh, start, stop, type SyncStatus } from './sync'
import { useAuth } from './useAuth'

export interface CloudSyncState {
  status: SyncStatus
  /** true when accounts are configured AND a user is signed in */
  enabled: boolean
}

export function useCloudSync(): CloudSyncState {
  const { user, configured } = useAuth()
  const [status, setStatus] = useState<SyncStatus>(getStatus())

  useEffect(() => onStatus(setStatus), [])

  useEffect(() => {
    if (!configured || !user) {
      stop()
      return
    }
    void start(user.id)
    // Flush pending pushes when the tab hides; re-pull when it returns, so a
    // project edited on another device appears without a manual reload.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending()
      else void refresh()
    }
    window.addEventListener('beforeunload', flushPending)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flushPending)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, user?.id])

  return { status, enabled: Boolean(configured && user) }
}
