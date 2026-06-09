// ============================================================================
// Throughline Studio — sign-in modal. Google OAuth + email magic-link, mirroring
// the suite's auth UX. Surfaces Supabase errors plainly (e.g. an origin not yet
// whitelisted in the dashboard) so sign-in problems are debuggable.
// ============================================================================

import { useEffect, useState } from 'react'
import { enabledProviders, isConfigured, signInWithEmail, signInWithGoogle } from '../lib/auth'
import { Icon } from './Icon'

export function AuthModal({ onClose }: { onClose: () => void }) {
  const configured = isConfigured()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleOn, setGoogleOn] = useState(false)

  useEffect(() => {
    if (configured) enabledProviders().then((p) => setGoogleOn(!!p.google)).catch(() => {})
  }, [configured])

  async function doGoogle() {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle() // redirects away on success
    } catch (e) {
      setError(message(e))
      setBusy(false)
    }
  }

  async function doEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setBusy(true)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="auth-close icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="plus" size={18} />
        </button>
        <span className="s-mark auth-mark" aria-hidden="true">S</span>
        <h2 className="modal-title">Sign in to Throughline Studio</h2>
        <p className="modal-sub">One account across Syed's research suite. The app works fully without it — sign in to carry your account in.</p>

        {!configured ? (
          <p className="auth-preview">Accounts aren't enabled in this build. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to turn them on.</p>
        ) : sent ? (
          <div className="auth-sent">
            <Icon name="check" size={22} />
            <p>Check <strong>{email}</strong> for a magic link. Open it to finish signing in.</p>
          </div>
        ) : (
          <>
            {googleOn && (
              <button className="btn btn-ghost auth-google" onClick={doGoogle} disabled={busy}>
                <GoogleG /> Continue with Google
              </button>
            )}
            {googleOn && <div className="auth-or"><span>or</span></div>}
            <form onSubmit={doEmail}>
              <label className="field-label" htmlFor="auth-email">Email a magic link</label>
              <input
                id="auth-email"
                className="field-input"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                disabled={busy}
              />
              <button className="btn btn-fill auth-submit" type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Send magic link'} <Icon name="arrow" size={15} />
              </button>
            </form>
          </>
        )}

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  )
}

function message(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/redirect|allowed|url/i.test(m)) return `${m} — add this site's URL to your Supabase Auth → URL Configuration.`
  return m
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 6.9l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16.9z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.9l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  )
}
