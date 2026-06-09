// ============================================================================
// Throughline Studio — sticky brand bar (Syed Fire house style).
// S-mark gradient + wordmark, portfolio link, the auth control (sign in /
// account menu), and the theme toggle. The logo routes home (#/).
// ============================================================================

import { useState } from 'react'
import { signOut, userInitial, userLabel } from '../lib/auth'
import { navigate } from '../lib/router'
import type { SyncStatus } from '../lib/sync'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { useAuth } from '../lib/useAuth'
import { AuthModal } from './AuthModal'
import { Icon } from './Icon'

export function BrandBar({ syncStatus }: { syncStatus?: SyncStatus | null }) {
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const { user, loading, configured } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bar">
      <a
        className="bar-logo"
        href="#/"
        onClick={(e) => {
          e.preventDefault()
          navigate('/')
        }}
        aria-label="Throughline Studio — home"
      >
        <span className="s-mark" aria-hidden="true">S</span>
        <span className="bar-word">
          Throughline <span className="bar-word-dim">Studio</span>
        </span>
      </a>

      <div className="bar-spacer" />

      <a className="bar-link" href="https://syahmedu.github.io/nexus/" target="_blank" rel="noopener noreferrer">
        All projects <Icon name="external" size={13} />
      </a>

      {syncStatus && <SyncPill status={syncStatus} />}

      {/* auth control */}
      {configured && !loading && (
        user ? (
          <div className="acct-wrap">
            <button
              className="acct-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={userLabel(user)}
            >
              <span className="acct-avatar">{userInitial(user)}</span>
            </button>
            {menuOpen && (
              <>
                <div className="acct-overlay" onClick={() => setMenuOpen(false)} />
                <div className="acct-menu" role="menu">
                  <div className="acct-menu-id">
                    <span className="acct-menu-label">Signed in as</span>
                    <span className="acct-menu-email">{userLabel(user)}</span>
                  </div>
                  <button
                    className="acct-menu-item"
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false)
                      await signOut()
                    }}
                  >
                    <Icon name="back" size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm bar-signin" onClick={() => setAuthOpen(true)}>
            Sign in
          </button>
        )
      )}

      <button
        className="bar-toggle"
        onClick={() => setThemeState(toggleTheme())}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  )
}

/** A small "cloud backup" indicator shown only while signed in. */
function SyncPill({ status }: { status: SyncStatus }) {
  if (status === 'idle') return null
  const label = status === 'syncing' ? 'Syncing…' : status === 'error' ? 'Sync error' : 'Synced'
  const title =
    status === 'error'
      ? 'Could not reach the cloud — your work is saved locally and will retry on the next change.'
      : status === 'synced'
        ? 'Your projects are backed up to your account and follow you across devices.'
        : 'Saving your projects to your account…'
  return (
    <span className={`sync-pill sync-${status}`} title={title} aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
