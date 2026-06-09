// ============================================================================
// Throughline Studio — sticky brand bar (Syed Fire house style).
// S-mark gradient + wordmark, portfolio link, the auth control (sign in /
// account menu), and the theme toggle. The logo routes home (#/).
// ============================================================================

import { useState } from 'react'
import { signOut, userInitial, userLabel } from '../lib/auth'
import { navigate } from '../lib/router'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { useAuth } from '../lib/useAuth'
import { AuthModal } from './AuthModal'
import { Icon } from './Icon'

export function BrandBar() {
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
