// ============================================================================
// Throughline Studio — identity layer.
// Built on the SAME Supabase project as the rest of the research suite
// (research-suite/suite-auth.js), so a single account spans the suite. The
// anon key is public by design — every row is protected by row-level security.
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; if neither the env
// nor the defaults are present, the app runs in "preview" mode (no login UI,
// fully usable, local-only).
// ============================================================================

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hpupaqzebvrjhrpywtzl.supabase.co'
const SUPA_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HwG-E4cFEuoeV_XlVxSrdA_E8x7UweQ'

export type { User }

export function isConfigured(): boolean {
  return Boolean(SUPA_URL && SUPA_ANON)
}

// Dead-backend circuit breaker: if the Supabase host is gone (NXDOMAIN),
// supabase-js + sync retries storm the network on every visit. After two
// consecutive network-level failures (fetch TypeError — DNS/offline only,
// auth/RLS errors don't count) all later calls fail instantly without
// touching the network — degrading to the same UX as preview mode.
let _netFails = 0
let _breakerOpen = false
async function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (_breakerOpen) throw new TypeError('auth: Supabase unreachable (circuit open)')
  try {
    const r = await fetch(input, init)
    _netFails = 0
    return r
  } catch (e) {
    if (++_netFails >= 2) {
      _breakerOpen = true
      console.warn('[auth] Supabase unreachable — staying offline for this page load.')
    }
    throw e
  }
}

let _client: SupabaseClient | null = null
export function client(): SupabaseClient | null {
  if (!isConfigured()) return null
  if (!_client) {
    _client = createClient(SUPA_URL, SUPA_ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: guardedFetch },
    })
  }
  return _client
}

export async function currentUser(): Promise<User | null> {
  const c = client()
  if (!c) return null
  const { data } = await c.auth.getUser()
  return data?.user ?? null
}

export function onAuthChange(cb: (u: User | null) => void): () => void {
  const c = client()
  if (!c) return () => {}
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null))
  return () => data?.subscription?.unsubscribe?.()
}

export async function signInWithGoogle(): Promise<void> {
  const c = client()
  if (!c) throw new Error('Accounts are not configured.')
  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  })
  if (error) throw error
}

/** Passwordless email — Supabase sends a magic link back to this origin. */
export async function signInWithEmail(email: string): Promise<void> {
  const c = client()
  if (!c) throw new Error('Accounts are not configured.')
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const c = client()
  if (c) await c.auth.signOut()
}

/** Which OAuth providers are enabled in the dashboard (to hide dead buttons).
 *  null = the accounts backend is unreachable at the network level, so the
 *  caller can warn BEFORE the user types an email that will only fail on
 *  submit; {} = reachable but no external providers enabled. */
export async function enabledProviders(): Promise<Record<string, boolean> | null> {
  if (!isConfigured()) return {}
  try {
    const r = await guardedFetch(SUPA_URL + '/auth/v1/settings', { headers: { apikey: SUPA_ANON } })
    if (!r.ok) return {}
    const json = (await r.json()) as { external?: Record<string, boolean> }
    return json.external || {}
  } catch {
    return null
  }
}

/** A short display label for a signed-in user. */
export function userLabel(u: User): string {
  const name = (u.user_metadata?.full_name || u.user_metadata?.name) as string | undefined
  return name || u.email || 'Account'
}

/** A single-letter avatar seed. */
export function userInitial(u: User): string {
  return (userLabel(u).trim()[0] || '?').toUpperCase()
}
