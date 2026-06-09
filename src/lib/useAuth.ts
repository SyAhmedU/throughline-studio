// ============================================================================
// Throughline Studio — auth state hook.
// Subscribes a component to the current Supabase user. In preview mode (no
// config) it resolves immediately to signed-out, so callers render cleanly.
// ============================================================================

import { useEffect, useState } from 'react'
import { currentUser, isConfigured, onAuthChange, type User } from './auth'

export interface AuthState {
  user: User | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState {
  const configured = isConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) return
    let alive = true
    currentUser().then((u) => {
      if (alive) {
        setUser(u)
        setLoading(false)
      }
    })
    const off = onAuthChange((u) => {
      if (alive) {
        setUser(u)
        setLoading(false)
      }
    })
    return () => {
      alive = false
      off()
    }
  }, [configured])

  return { user, loading, configured }
}
