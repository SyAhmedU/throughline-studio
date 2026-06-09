// ============================================================================
// Throughline Studio — theme. Dark default; persisted under `syed-theme`
// (shared key across the suite). The pre-paint restore lives in index.html;
// this module only toggles at runtime.
// ============================================================================

export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
}

export function setTheme(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t)
  try {
    localStorage.setItem('syed-theme', t)
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
