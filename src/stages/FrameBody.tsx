// ============================================================================
// Throughline Studio — Frame stage workspace.
// Turn an idea into a defensible design: research question, gap, hypotheses,
// design + constructs, and a real theoretical lens attached from TheoryScope's
// 632-theory catalogue. Persists to project.stages.frame.data (+ syncs the
// project's research question). Deep-links to ResearchFlow / TheoryScope /
// FallacyScope for the full wizard, map, and pitfalls.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { ReadingFacets } from '../components/ReadingFacets'
import XwalkChips from '../components/XwalkChips'
import { framedConstructs } from './MeasureBody'
import { generate } from '../lib/api'
import { readingList } from '../lib/corpus'
import { fmtLockDate, preregLock } from '../lib/prereg'
import { deepLink, stageDef, toolLabel } from '../lib/stages'
import { saveProject } from '../lib/store'
import {
  loadTheories,
  loadTheoryUsage,
  searchTheories,
  suggestTheories,
  theoryLink,
  toSavedTheory,
  type SavedTheory,
  type Theory,
  type TheoryUsage,
} from '../lib/theories'
import type { Project } from '../lib/types'

interface FrameData {
  gap?: string
  hypotheses?: string[]
  design?: string
  iv?: string
  dv?: string
  mediators?: string
  moderators?: string
  theory?: SavedTheory | null
}

const DESIGNS = [
  'Experimental',
  'Quasi-experimental',
  'Correlational / survey',
  'Longitudinal',
  'Multilevel / nested (teams, classes, dyads)',
  'Diary / experience sampling',
  'Qualitative',
  'Mixed-methods',
]

export function FrameBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const stored = (project.stages.frame.data || {}) as FrameData
  const [form, setForm] = useState({
    question: project.question || '',
    gap: stored.gap || '',
    design: stored.design || '',
    iv: stored.iv || '',
    dv: stored.dv || '',
    mediators: stored.mediators || '',
    moderators: stored.moderators || '',
    hypotheses: stored.hypotheses || [],
    theory: stored.theory || null,
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  // debounced persist (question → project root; rest → frame.data); flush on unmount
  const timer = useRef<number | undefined>(undefined)
  const projRef = useRef(project)
  projRef.current = project
  const formRef = useRef(form)
  formRef.current = form
  const first = useRef(true)
  function persist(notify: boolean) {
    const p = projRef.current
    const { question, ...fd } = formRef.current
    const saved = saveProject({
      ...p,
      question,
      stages: { ...p.stages, frame: { ...p.stages.frame, data: fd } },
    })
    if (notify) onChange(saved)
  }
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => persist(true), 350)
    return () => window.clearTimeout(timer.current)
  }, [form])
  useEffect(() => () => persist(false), []) // flush latest on unmount

  // theory grounding
  const [tq, setTq] = useState('')
  const [theories, setTheories] = useState<Theory[] | null>(null)
  const [tStatus, setTStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [tUsage, setTUsage] = useState<Record<string, TheoryUsage>>({})
  function ensureTheories() {
    if (theories || tStatus === 'loading') return
    setTStatus('loading')
    loadTheories()
      .then((ts) => {
        setTheories(ts)
        setTStatus('ready')
      })
      .catch(() => setTStatus('error'))
    loadTheoryUsage().then(setTUsage)
  }
  const usageBadge = (slug: string) => {
    const n = tUsage[slug]?.n
    return n ? (
      <span className="disc-chip" style={{ cursor: 'default' }}
        title={`Named verbatim in ${n} recent papers (2024→) in the Research Book — machine-matched, verify`}>
        ↑ {n} recent
      </span>
    ) : null
  }
  const results = theories ? searchTheories(theories, tq).slice(0, 12) : []

  // suggested lenses — deterministic token match on the study's own words;
  // catalogue loads as soon as the lens is empty so suggestions can render
  useEffect(() => {
    if (!form.theory) ensureTheories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.theory])
  const suggested = useMemo(
    () =>
      theories && !form.theory
        ? suggestTheories(theories, [
            project.title,
            form.question,
            form.iv,
            form.dv,
            form.mediators,
            form.moderators,
          ])
        : [],
    [theories, form.theory, project.title, form.question, form.iv, form.dv, form.mediators, form.moderators],
  )

  // ── ✦ AI draft — fills EMPTY fields only, grounded on the reading list ────
  // The draft is a starting point to verify and edit, never a source: the
  // prompt forbids invented citations/statistics/findings (no-fab), and the
  // notice below the section says exactly which fields the model touched.
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'offline' | 'error'>('idle')
  const [aiFilled, setAiFilled] = useState<string[]>([])

  // React state can't stop synchronous double-clicks — the re-render that
  // disables the button lands after all the clicks (audit S9: 3 clicks fired
  // 9 backend calls). The ref is the real in-flight guard.
  const aiBusy = useRef(false)
  async function draftWithAI() {
    if (aiBusy.current) return
    aiBusy.current = true
    try {
      await draftWithAIInner()
    } finally {
      aiBusy.current = false
    }
  }
  async function draftWithAIInner() {
    if (aiStatus === 'loading') return
    setAiStatus('loading')
    const f = formRef.current
    const papers = readingList(projRef.current).slice(0, 8)
    const grounding = papers.length
      ? `Reading list the researcher has gathered (titles only — do NOT invent details about these papers):\n${papers
          .map((p) => `- ${p.title}${p.year ? ` (${p.year})` : ''}`)
          .join('\n')}`
      : 'No reading list yet.'
    const prompt = [
      `You are helping a researcher frame a quantitative social-science study. Draft framing fields as JSON.`,
      `Project title: ${projRef.current.title || '(untitled)'}`,
      `Field: ${projRef.current.field || 'Organizational Behavior / management'}`,
      f.question.trim() ? `Research question so far (keep its intent): ${f.question.trim()}` : 'No research question yet.',
      grounding,
      `Rules: NEVER invent citations, author names, statistics, effect sizes, or empirical findings — propose constructs and directional predictions only, phrased as hypotheses to be tested, not facts. Hypotheses must each be ONE directional, testable sentence. "design" MUST be exactly one of: ${DESIGNS.join(' | ')}.`,
    ].join('\n\n')
    const res = await generate(prompt, {
      schemaHint:
        '{"question": string, "gap": string, "hypotheses": string[] (max 4, one directional sentence each), "design": string, "iv": string, "dv": string, "mediators": string, "moderators": string}',
      temperature: 0.5,
    })
    const d = (res.data && typeof res.data === 'object' ? res.data : null) as Record<string, unknown> | null
    if (!res.ok || !d) {
      setAiStatus(res.ok || res.reason === 'error' ? 'error' : 'offline')
      return
    }
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const filled: string[] = []
    const patch: Partial<typeof form> = {}
    const fillText = (key: 'question' | 'gap' | 'iv' | 'dv' | 'mediators' | 'moderators') => {
      if (!f[key].trim() && str(d[key])) {
        patch[key] = str(d[key])
        filled.push(key)
      }
    }
    fillText('question')
    fillText('gap')
    fillText('iv')
    fillText('dv')
    fillText('mediators')
    fillText('moderators')
    if (!f.design && DESIGNS.includes(str(d.design))) {
      patch.design = str(d.design)
      filled.push('design')
    }
    const hasHyps = f.hypotheses.some((h) => h.trim())
    if (!hasHyps && Array.isArray(d.hypotheses)) {
      const hyps = d.hypotheses.map(str).filter(Boolean).slice(0, 4)
      if (hyps.length) {
        patch.hypotheses = hyps
        filled.push('hypotheses')
      }
    }
    setAiFilled(filled)
    if (Object.keys(patch).length) set(patch)
    setAiStatus('done')
  }

  const tools = stageDef('frame').tools
  const lock = preregLock(project)

  return (
    <div className="bld">
      {lock && (
        <p className="prereg-locked">
          <Icon name="check" size={14} /> This study was preregistered on {fmtLockDate(lock.lockedAt)}. The question,
          hypotheses, and design below are frozen in the prereg — anything you change from here on is exploratory and
          must be reported as a deviation.
        </p>
      )}

      {/* question + gap */}
      <section className="bld-section">
        <div className="bld-section-head">
          <h2 className="bld-h" style={{ margin: 0 }}>The study in two sentences</h2>
          {!lock && (
            <button className="btn btn-ghost btn-sm" onClick={draftWithAI} disabled={aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'Drafting…' : '✦ Draft with AI'}
            </button>
          )}
        </div>
        {aiStatus === 'done' && aiFilled.length > 0 && (
          <p className="anz-warn">
            ✦ AI-drafted: {aiFilled.join(', ')}. Verify every claim and edit freely — nothing is grounded until you
            ground it.
          </p>
        )}
        {aiStatus === 'done' && aiFilled.length === 0 && (
          <p className="anz-warn">✦ Nothing to fill — every field already has your own text. Clear a field first to redraft it.</p>
        )}
        {aiStatus === 'offline' && (
          <p className="anz-warn">✦ The AI backends are unreachable right now — frame it by hand, or try again later.</p>
        )}
        {aiStatus === 'error' && (
          <p className="anz-warn">✦ The AI draft failed — try again, or frame it by hand.</p>
        )}
        <label className="bld-label" htmlFor="fr-q">Research question</label>
        <textarea
          id="fr-q"
          className="bld-textarea"
          value={form.question}
          onChange={(e) => set({ question: e.target.value })}
          placeholder="e.g. Does servant leadership increase team engagement, and is the effect mediated by psychological safety?"
          rows={2}
        />
        <label className="bld-label" htmlFor="fr-gap">The gap it fills</label>
        <textarea
          id="fr-gap"
          className="bld-textarea"
          value={form.gap}
          onChange={(e) => set({ gap: e.target.value })}
          placeholder="What's missing in what's already known? Why does this study need to exist?"
          rows={2}
        />
        <p className="anz-fineprint" style={{ marginTop: 6 }}>
          Not sure what the gap is?{' '}
          <a
            href={`https://syahmedu.github.io/journaltime/?topic=${encodeURIComponent(topic)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find the gap with Research Compass ↗
          </a>
        </p>
      </section>

      {/* hypotheses */}
      <section className="bld-section">
        <h2 className="bld-h">Hypotheses</h2>
        {form.hypotheses.length === 0 && <p className="bld-muted">No hypotheses yet.</p>}
        <ol className="bld-hyps">
          {form.hypotheses.map((h, i) => (
            <li key={i} className="bld-hyp">
              <span className="bld-hyp-n">H{i + 1}</span>
              <input
                className="bld-input"
                value={h}
                onChange={(e) => set({ hypotheses: form.hypotheses.map((x, idx) => (idx === i ? e.target.value : x)) })}
                placeholder="State a directional, testable prediction…"
              />
              <button
                className="icon-btn"
                aria-label="Remove hypothesis"
                onClick={() => set({ hypotheses: form.hypotheses.filter((_, idx) => idx !== i) })}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ol>
        <button className="btn btn-ghost btn-sm" onClick={() => set({ hypotheses: [...form.hypotheses, ''] })}>
          <Icon name="plus" size={14} /> Add hypothesis
        </button>
      </section>

      {/* design + constructs */}
      <section className="bld-section">
        <h2 className="bld-h">Design & constructs</h2>
        <div className="bld-grid">
          <Field label="Design">
            <select className="disc-select" value={form.design} onChange={(e) => set({ design: e.target.value })}>
              <option value="">Choose…</option>
              {DESIGNS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Independent variable(s)">
            <input className="bld-input" value={form.iv} onChange={(e) => set({ iv: e.target.value })} placeholder="predictor / treatment" />
          </Field>
          <Field label="Dependent variable(s)">
            <input className="bld-input" value={form.dv} onChange={(e) => set({ dv: e.target.value })} placeholder="outcome" />
          </Field>
          <Field label="Mediator(s)">
            <input className="bld-input" value={form.mediators} onChange={(e) => set({ mediators: e.target.value })} placeholder="optional" />
          </Field>
          <Field label="Moderator(s)">
            <input className="bld-input" value={form.moderators} onChange={(e) => set({ moderators: e.target.value })} placeholder="optional" />
          </Field>
        </div>
        {form.design === 'Qualitative' && (
          <p className="anz-warn">
            Qualitative design: the IV/DV/mediator boxes and directional hypotheses are quantitative machinery — use
            them only if you have a quant strand. For a qualitative study, put your research question(s) above, treat
            constructs as sensitizing concepts, and skip hypotheses; Collect switches to purposive sampling +
            saturation, and Analyze points to the qualitative coding workbench.
          </p>
        )}
        {/multilevel|nested|diary|experience sampling/i.test(form.design) && (
          <p className="anz-warn">
            Nested / repeated observations: state the levels explicitly (e.g., days within persons, employees within
            teams) in your hypotheses — effects can differ across levels, and the power planner and flat statistics
            need cluster-aware handling (both stages will remind you).
          </p>
        )}
      </section>

      {/* the framed constructs, linked across the suite via the Book's crosswalk */}
      <XwalkChips labels={framedConstructs(form)} />

      {/* what the reading list grounds: theories to consider, constructs in play */}
      <ReadingFacets
        project={project}
        keys={['theory', 'constructs']}
        lead="Theories and constructs your reading-list papers actually used — click a theory to search it as your lens."
        onUse={{
          theory: (text) => {
            set({ theory: null })
            setTq(text)
            ensureTheories()
          },
        }}
        useTitle="search it in the theory catalogue below"
      />

      {/* theoretical lens */}
      <section className="bld-section">
        <h2 className="bld-h">Theoretical lens</h2>
        {form.theory ? (
          <div className="bld-attached">
            <div>
              <span className="bld-attached-name">
                {form.theory.name} {form.theory.acronym && <span className="disc-dim">({form.theory.acronym})</span>}
              </span>
              {form.theory.oneLiner && <p className="bld-attached-line">{form.theory.oneLiner}</p>}
              {form.theory.citation && <p className="bld-cite">{form.theory.citation}</p>}
            </div>
            <div className="bld-attached-actions">
              <a className="disc-fulltool" href={theoryLink(form.theory.slug)} target="_blank" rel="noopener noreferrer">
                Open ↗
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => set({ theory: null })}>Change</button>
            </div>
          </div>
        ) : (
          <>
            {suggested.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <span className="bld-label" style={{ margin: '0 0 6px' }}>
                  Suggested from your study's own words — token match, judge fit yourself
                </span>
                <div className="disc-results">
                  {suggested.map((t) => (
                    <article key={t.slug} className="disc-card">
                      <div className="disc-card-main">
                        <h3 className="disc-title">
                          {t.name} {t.acronym && <span className="disc-dim">({t.acronym})</span>} {usageBadge(t.slug)}
                        </h3>
                        {t.oneLiner && <p className="bld-attached-line">{t.oneLiner}</p>}
                      </div>
                      <div className="disc-card-actions">
                        <button className="btn btn-fill btn-sm" onClick={() => set({ theory: toSavedTheory(t) })}>
                          <Icon name="plus" size={14} /> Lens
                        </button>
                        <a className="btn btn-ghost btn-sm" href={theoryLink(t.slug)} target="_blank" rel="noopener noreferrer">Open</a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            <div className="disc-search">
              <Icon name="frame" size={16} />
              <input
                className="disc-search-input"
                value={tq}
                onFocus={ensureTheories}
                onChange={(e) => setTq(e.target.value)}
                placeholder="Search 632 theories — name, construct, discipline…"
              />
            </div>
            {tStatus === 'loading' && <p className="bld-muted">Loading the theory catalogue…</p>}
            {tStatus === 'error' && <p className="anz-error">Couldn't reach TheoryScope — open it directly below.</p>}
            {tStatus === 'ready' && (
              <div className="disc-results" style={{ marginTop: 12 }}>
                {results.map((t) => (
                  <article key={t.slug} className="disc-card">
                    <div className="disc-card-main">
                      <h3 className="disc-title">
                        {t.name} {t.acronym && <span className="disc-dim">({t.acronym})</span>} {usageBadge(t.slug)}
                      </h3>
                      <p className="disc-meta">
                        {t.originators && <span>{t.originators}</span>}
                        {t.year && <span className="disc-dim"> · {t.year}</span>}
                        {t.discipline && <span className="disc-dim"> · {t.discipline}</span>}
                      </p>
                      {t.oneLiner && <p className="bld-attached-line">{t.oneLiner}</p>}
                      <div className="disc-chips">
                        {(t.constructs || []).slice(0, 6).map((c) => (
                          <span key={c} className="disc-chip" style={{ cursor: 'default' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="disc-card-actions">
                      <button className="btn btn-fill btn-sm" onClick={() => set({ theory: toSavedTheory(t) })}>
                        <Icon name="plus" size={14} /> Lens
                      </button>
                      <a className="btn btn-ghost btn-sm" href={theoryLink(t.slug)} target="_blank" rel="noopener noreferrer">Open</a>
                    </div>
                  </article>
                ))}
                {results.length === 0 && <p className="disc-empty">No theory matches that — try a construct or discipline.</p>}
              </div>
            )}
          </>
        )}
      </section>

      <div className="disc-fulltools">
        <span className="disc-fulltools-label">Frame it deeper ↗</span>
        <div className="disc-fulltools-row">
          {tools.map((t) => (
            <a key={t.name} className="disc-fulltool" href={deepLink(t, topic)} target="_blank" rel="noopener noreferrer">
              {toolLabel(t)} <Icon name="external" size={12} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="bld-field">
      <span className="bld-label">{label}</span>
      {children}
    </label>
  )
}
