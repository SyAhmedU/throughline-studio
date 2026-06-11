// ============================================================================
// Throughline Studio — the living ambient backdrop.
// Three brand-hued aurora blobs in slow infinite drift, a faint conic sheen
// rotating forever, and the signature: a thread that flows across the
// background endlessly (dash pulses travelling one long curve).
// Purely ambient — never cursor-reactive — and hidden entirely under
// prefers-reduced-motion (the static wash in theme.css remains).
// ============================================================================

export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <i className="amb-blob amb-a" />
      <i className="amb-blob amb-b" />
      <i className="amb-blob amb-c" />
      <i className="amb-sheen" />
      <svg className="amb-thread" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="amb-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FF9656" />
            <stop offset=".5" stopColor="#F14575" />
            <stop offset="1" stopColor="#9270F4" />
          </linearGradient>
        </defs>
        {/* the infinite throughline — pulses travel it forever */}
        <path d="M -4 82 C 20 66, 32 94, 52 72 C 68 54, 76 30, 104 14" pathLength={100} />
      </svg>
    </div>
  )
}
