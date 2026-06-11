// ============================================================================
// Throughline Studio — Frame stage workspace.
// Turn an idea into a defensible design: research question, gap, hypotheses,
// design + constructs, and a real theoretical lens attached from TheoryScope's
// 632-theory catalogue. Persists to project.stages.frame.data (+ syncs the
// project's research question). Deep-links to ResearchFlow / TheoryScope /
// FallacyScope for the full wizard, map, and pitfalls.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { fmtLockDate, preregLock } from '../lib/prereg'
import { deepLink, stageDef } from '../lib/stages'
import { saveProject } from '../lib/store'
import {
  loadTheories,
  searchTheories,
  theoryLink,
  toSavedTheory,
  type SavedTheory,
  type Theory,
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
  function ensureTheories() {
    if (theories || tStatus === 'loading') return
    setTStatus('loading')
    loadTheories()
      .then((ts) => {
        setTheories(ts)
        setTStatus('ready')
      })
      .catch(() => setTStatus('error'))
  }
  const results = theories ? searchTheories(theories, tq).slice(0, 12) : []

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
        <h2 className="bld-h">The study in two sentences</h2>
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
      </section>

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
                        {t.name} {t.acronym && <span className="disc-dim">({t.acronym})</span>}
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
              {t.name} <Icon name="external" size={12} />
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
