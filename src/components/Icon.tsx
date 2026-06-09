// ============================================================================
// Throughline Studio — inline SVG icon set. Stroke icons inherit `currentColor`
// so they pick up the surrounding text colour. Keyed by name; one source.
// ============================================================================

import type { ReactElement } from 'react'

export type IconName =
  | 'discover'
  | 'frame'
  | 'measure'
  | 'collect'
  | 'analyze'
  | 'write'
  | 'publish'
  | 'plus'
  | 'arrow'
  | 'external'
  | 'check'
  | 'trash'
  | 'sun'
  | 'moon'
  | 'back'
  | 'dot'

const PATHS: Record<IconName, ReactElement> = {
  // stage glyphs
  discover: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  frame: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-3.5 3.5-3.5-3.5M12 12v4" /></>,
  measure: <><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>,
  collect: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /></>,
  analyze: <><path d="M4 4v16h16" /><path d="M8 15l3-4 3 2 4-6" /></>,
  write: <><path d="M14 4l6 6L8 22H2v-6L14 4z" /><path d="M11 7l6 6" /></>,
  publish: <><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></>,
  // ui
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" /></>,
  back: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
  dot: <><circle cx="12" cy="12" r="3" /></>,
}

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
