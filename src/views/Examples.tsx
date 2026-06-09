// ============================================================================
// Throughline Studio — worked examples (case studies).
// Ten real, DOI-verified papers, each walked through the seven-stage spine to
// show the workspace in motion: timeline, what happened at each stage, why that
// tool, and why not the alternatives. The papers are real; the journeys are an
// illustrative reconstruction (the papers predate the tool) — stated up front.
// ============================================================================

import { Icon } from '../components/Icon'
import { apaRef, CASE_STUDIES, caseStudy, doiUrl, type CaseStudy } from '../lib/caseStudies'
import { navigate } from '../lib/router'
import { stageDef } from '../lib/stages'

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
  return (
    <div className="examples">
      <header className="ex-head">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <Icon name="back" size={14} /> Home
        </button>
        <h1 className="ex-title">
          Ten real papers, <span className="grad-text">walked A&nbsp;→&nbsp;Z</span>
        </h1>
        <p className="ex-sub">
          Each is a real, published study — author, journal, and DOI verified. The seven-stage
          journey is an <strong>illustrative reconstruction</strong>: these papers predate
          Throughline Studio, so it shows how a researcher producing the same work today would move
          through the suite — what they’d do at each stage, why that tool, and why not the
          alternatives.
        </p>
      </header>

      <div className="ex-grid">
        {CASE_STUDIES.map((c) => (
          <article
            key={c.slug}
            className="ex-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/examples/${c.slug}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/examples/${c.slug}`)
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
              <span className="ex-card-design">{c.design.split(' · ')[0]}</span>
              <span className="ex-card-open">
                Walkthrough <Icon name="arrow" size={13} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ── one case study ───────────────────────────────────────────────────────────
function CaseStudyDetail({ study }: { study: CaseStudy }) {
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
        <button className="btn btn-fill" onClick={() => navigate('/')}>
          Start your own project <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  )
}
