// "Across the suite" strip — the researcher's framed constructs, linked into
// TheoryScope (theories framed around them), ScaleScope (validated scales
// measuring them) and the Research Book (papers coded to them) via the Book's
// published crosswalk. Everything here is label-matched (no AI), so the strip
// always carries the machine-matched · verify note. Renders nothing when no
// construct matches — silence over noise.

import { useXwalk } from '../lib/xwalk'

export default function XwalkChips({ labels }: { labels: string[] }) {
  const matches = useXwalk(labels)
  if (!matches.length) return null
  return (
    <div className="xw-strip" data-reveal>
      <span className="xw-lead">🧵 Across the suite</span>
      {matches.map((m) => (
        <span key={m.label} className="xw-row">
          <b className="xw-label">{m.label}</b>
          {m.theories.slice(0, 3).map((t) => (
            <a key={t.s} className="xw-chip" href={`https://theoryscope.vercel.app/#/theory/${t.s}`}
              target="_blank" rel="noopener noreferrer" title="Open this theory in TheoryScope">
              🧠 {t.n} ↗
            </a>
          ))}
          {m.scales.slice(0, 3).map((s) => (
            s.id != null ? (
              <a key={s.n} className="xw-chip" href={`https://scalescope.vercel.app/?scale=${s.id}`}
                target="_blank" rel="noopener noreferrer" title="Open this validated scale in ScaleScope">
                📏 {s.ab || s.n} ↗
              </a>
            ) : <span key={s.n} className="xw-chip">📏 {s.ab || s.n}</span>
          ))}
          {m.bookUrl && (
            <a className="xw-chip" href={m.bookUrl} target="_blank" rel="noopener noreferrer"
              title="Browse the corpus papers coded to this construct">
              📚 corpus ↗
            </a>
          )}
        </span>
      ))}
      <span className="xw-note">label-matched via the Research Book crosswalk — machine-matched · verify</span>
    </div>
  )
}
