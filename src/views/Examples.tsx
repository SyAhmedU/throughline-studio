// ============================================================================
// Throughline Studio — worked examples (case studies).
// Ten real, DOI-verified papers, each walked through the seven-stage spine to
// show the workspace in motion: timeline, what happened at each stage, why that
// tool, and why not the alternatives. The papers are real; the journeys are an
// illustrative reconstruction (the papers predate the tool) — stated up front.
// ============================================================================

import { useState } from 'react'
import { Icon } from '../components/Icon'
import { VideoLightbox } from '../components/VideoLightbox'
import {
  apaRef,
  CASE_STUDIES,
  caseStudy,
  doiUrl,
  paceOf,
  seedNote,
  seedOf,
  type CaseStudy,
} from '../lib/caseStudies'
import { navigate } from '../lib/router'
import { stageDef } from '../lib/stages'
import { createProject, setStageNotes } from '../lib/store'

/** Seed a real, editable project from a case study and open it. */
function startFromExample(study: CaseStudy) {
  const { topic, field } = seedOf(study)
  const p = createProject(topic, field)
  const seeded = setStageNotes(p, 'discover', seedNote(study))
  navigate(`/p/${seeded.id}`)
}

export function Examples({ slug }: { slug?: string }) {
  const study = slug ? caseStudy(slug) : undefined
  if (slug && !study) {
    return (
      <div className="notfound">
        <p>That example could not be found.</p>
        <button className="btn btn-fill" onClick={() => navigate('/examples')}>
          <Icon name="back" size={15} /> All examples
        </button>
      </div>
    )
  }
  return study ? <CaseStudyDetail study={study} /> : <Gallery />
}

// ── gallery ─────────────────────────────────────────────────────────────────
function Gallery() {
  const shorts = CASE_STUDIES.filter((c) => paceOf(c) === 'short')
  const longs = CASE_STUDIES.filter((c) => paceOf(c) === 'long')
  return (
    <div className="examples">
      <header className="ex-head">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <Icon name="back" size={14} /> Home
        </button>
        <h1 className="ex-title">
          {CASE_STUDIES.length} real papers, <span className="grad-text">walked A&nbsp;→&nbsp;Z</span>
        </h1>
        <p className="ex-sub">
          Every paper is real — author, journal, and DOI verified. The seven-stage journey is an{' '}
          <strong>illustrative reconstruction</strong> (these papers predate Throughline Studio):
          what a researcher producing the same work today would do at each stage, why that tool, and
          why not the alternatives. Grouped by pace — <strong>quick-turnaround studies</strong> done
          in weeks, and <strong>long builds</strong> that run for months or years.
        </p>
      </header>

      <ExSection
        title="Short, quick-turnaround studies"
        pace="short"
        note="Single experiments, secondary-data analyses, and contained field trials — weeks to a few months."
        items={shorts}
      />
      <ExSection
        title="Long, multi-year studies"
        pace="long"
        note="Field studies, scale development, longitudinal and meta-analytic work — months to years."
        items={longs}
      />
    </div>
  )
}

function paceLabel(pace: 'short' | 'long'): string {
  return pace === 'short' ? '⚡ Short' : '🗓 Long'
}

function ExSection({
  title,
  pace,
  note,
  items,
}: {
  title: string
  pace: 'short' | 'long'
  note: string
  items: CaseStudy[]
}) {
  return (
    <section className="ex-section">
      <div className="ex-section-head">
        <h2 className="ex-section-title">
          <span className={`pace-chip pace-${pace}`}>{paceLabel(pace)}</span>
          {title}
          <span className="ex-section-count">{items.length}</span>
        </h2>
        <p className="ex-section-note">{note}</p>
      </div>
      <div className="ex-grid">
        {items.map((c) => (
          <ExCard key={c.slug} c={c} />
        ))}
      </div>
    </section>
  )
}

function ExCard({ c }: { c: CaseStudy }) {
  const open = () => navigate(`/examples/${c.slug}`)
  return (
    <article
      className="ex-card"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        // role="button" must respond to Space as well as Enter
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className="ex-card-meta">
        <span className="ex-card-journal">{c.journal}</span>
        <span className="ex-card-year">{c.year}</span>
      </div>
      <h3 className="ex-card-title">{c.title}</h3>
      <p className="ex-card-authors">{c.authors}</p>
      <p className="ex-card-angle">{c.angle}</p>
      <div className="ex-card-foot">
        <span className="ex-card-design">{c.totalTime}</span>
        <span className="ex-card-open">
          Walkthrough <Icon name="arrow" size={13} />
        </span>
      </div>
      {/* the clone affordance lived only at the detail-page footer and no
          audit persona ever found it (B5) — surface it on the card itself */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={(e) => {
          e.stopPropagation()
          startFromExample(c)
        }}
        title="Create an editable project seeded from this paper's topic — then make it your own"
      >
        <Icon name="plus" size={13} /> Start my project from this
      </button>
    </article>
  )
}

// ── one case study ───────────────────────────────────────────────────────────
// Walkthrough videos live in the SyAhmedU/throughline-media Pages repo (140 MB
// of MP4s would bloat this repo and every deploy); posters are small and local.
const MEDIA_BASE = 'https://syahmedu.github.io/throughline-media'

function CaseStudyDetail({ study }: { study: CaseStudy }) {
  const [showVideo, setShowVideo] = useState(false)
  const videoSrc = `${MEDIA_BASE}/videos/${study.slug}.mp4`
  const posterSrc = `/examples/posters/${study.slug}.jpg`
  const facts: Array<[string, string]> = [
    ['Design', study.design],
    ['Construct', study.construct],
    ['Theory', study.theory],
    ['Instrument', study.instrument],
  ]
  return (
    <div className="examples">
      <header className="ex-head">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/examples')}>
          <Icon name="back" size={14} /> All examples
        </button>
        <p className="cs-kicker">
          {study.journal} · {study.year}
        </p>
        <h1 className="cs-title">{study.title}</h1>
        <p className="cs-authors">{study.authors}</p>
        <div className="cs-links">
          <span className={`pace-chip pace-${paceOf(study)}`}>
            {paceOf(study) === 'short' ? '⚡ Short study' : '🗓 Long study'}
          </span>
          <a className="cs-doi" href={doiUrl(study.doi)} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={13} /> doi.org/{study.doi}
          </a>
          <span className="cs-time">
            <Icon name="collect" size={13} /> Reconstructed journey · {study.totalTime}
          </span>
        </div>
      </header>

      {/* the real, verified facts */}
      <section className="cs-facts">
        {facts.map(([k, v]) => (
          <div className="cs-fact" key={k}>
            <span className="cs-fact-k">{k}</span>
            <span className="cs-fact-v">{v}</span>
          </div>
        ))}
        <div className="cs-fact cs-fact-wide">
          <span className="cs-fact-k">Headline finding</span>
          <span className="cs-fact-v">{study.finding}</span>
        </div>
      </section>

      <p className="cs-disclaimer">
        The facts above are from the published paper ({apaRef(study)}). The seven steps below are an
        illustrative reconstruction of how Throughline Studio would carry this study from discovery
        to publication — the authors did not use the tool.
      </p>

      {/* narrated walkthrough video */}
      <button className="cs-video" onClick={() => setShowVideo(true)} aria-label="Watch the narrated walkthrough of this example">
        <img className="cs-video-poster" src={posterSrc} alt="" loading="lazy" />
        <span className="hero-tour-overlay">
          <span className="hero-tour-play">▶</span>
          Watch this example, narrated — {study.totalTime}, stage by stage
        </span>
      </button>
      {showVideo && (
        <VideoLightbox src={videoSrc} poster={posterSrc} label="Worked example walkthrough video" onClose={() => setShowVideo(false)} />
      )}

      {/* the seven-stage timeline */}
      <ol className="cs-timeline">
        {study.steps.map((step) => {
          const def = stageDef(step.stage)
          return (
            <li className="cs-step" key={step.stage}>
              <div className="cs-step-rail">
                <span className="cs-step-icon">
                  <Icon name={step.stage} size={18} />
                </span>
              </div>
              <div className="cs-step-body">
                <div className="cs-step-head">
                  <span className="cs-step-n">{String(def.n).padStart(2, '0')}</span>
                  <h3 className="cs-step-title">{def.title}</h3>
                  <span className="cs-step-when">{step.when}</span>
                </div>
                <p className="cs-step-tool">
                  <Icon name="arrow" size={12} /> {step.tool}
                </p>
                <p className="cs-step-did">{step.did}</p>
                <p className="cs-step-why">
                  <span className="cs-tag cs-tag-why">Why</span> {step.why}
                </p>
                {step.insteadOf && (
                  <p className="cs-step-not">
                    <span className="cs-tag cs-tag-not">Not</span> {step.insteadOf}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="cs-foot">
        <button className="btn btn-ghost" onClick={() => navigate('/examples')}>
          <Icon name="back" size={15} /> All examples
        </button>
        <button className="btn btn-fill" onClick={() => startFromExample(study)}>
          Start a project from this example <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  )
}
