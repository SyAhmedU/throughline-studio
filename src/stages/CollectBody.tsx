// ============================================================================
// Throughline Studio — Collect stage workspace.
// Plan the data collection: a power-based target N (real Cohen approximations),
// a survey blueprint assembled from the Measure-stage instrument, the
// PREREGISTRATION (assembled + locked HERE, before the first participant — not
// at Publish), an ethics & design checklist, consent text, and live collection
// status. Persists to project.stages.collect.data and hands off to Cadence.
// ============================================================================

import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { generate } from '../lib/api'
import { nForCorr, nPerGroup } from '../lib/power'
import { buildPrereg, fmtLockDate, planValues } from '../lib/prereg'
import type { SavedScale } from '../lib/scales'
import { deepLink, stageDef } from '../lib/stages'
import { useStageData } from '../lib/useStageData'
import type { Project } from '../lib/types'

interface CollectData extends Record<string, unknown> {
  effectKind?: 'd' | 'r'
  effectSize?: string
  alpha?: string
  power?: string
  mode?: string
  consentText?: string
  targetN?: string
  collectedN?: string
  status?: string
  startDate?: string
  // preregistration (moved here from Publish — it must precede collection)
  samplingPlan?: string
  analysisPlan?: string
  exclusions?: string
  preregText?: string
  preregLockedAt?: number
  // ethics & design checks
  ethicsApproval?: boolean
  dataProtection?: boolean
  compensation?: boolean
  cmvPlan?: boolean
}

const DEFAULT_CONSENT =
  'You are invited to take part in a research study. Participation is voluntary and anonymous; you may stop at any time without penalty. Your responses will be used for research purposes only and reported in aggregate. By continuing, you confirm that you are 18 or older and consent to participate.'

const MODES = ['Online panel', 'Online (self-recruited)', 'In-person / lab', 'Field', 'Mixed']
const STATUSES = ['Not started', 'Piloting', 'Collecting', 'Complete']

const ETHICS_CHECKS: { key: keyof CollectData; label: string }[] = [
  { key: 'ethicsApproval', label: 'Ethics / IRB approval obtained (or exemption documented)' },
  { key: 'dataProtection', label: 'Data protection planned — anonymisation, storage, retention' },
  { key: 'compensation', label: 'Participant burden & compensation are fair and stated' },
  { key: 'cmvPlan', label: 'Same-source bias addressed — second source, temporal separation, or acknowledged as a limitation' },
]

export function CollectBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [form, update] = useStageData<CollectData>(project, 'collect', onChange)
  const [copied, setCopied] = useState(false)
  const effectKind = form.effectKind || 'd'

  const scales = ((project.stages.measure?.data as { scales?: SavedScale[] })?.scales) || []
  const totalItems = scales.reduce((a, s) => a + (s.itemCount || 0), 0)
  const estMinutes = Math.max(1, Math.round((totalItems * 12) / 60)) // ~12s/item

  const frame = (project.stages.frame?.data || {}) as {
    hypotheses?: string[]
    design?: string
    mediators?: string
    moderators?: string
  }
  const beyondPlanner = [
    frame.mediators?.trim() ? 'mediator(s)' : '',
    frame.moderators?.trim() ? 'moderator(s)' : '',
  ].filter(Boolean)

  const suggestedN = useMemo(() => {
    const e = Number(form.effectSize)
    const a = Number(form.alpha) || 0.05
    const pw = Number(form.power) || 0.8
    if (!Number.isFinite(e) || e <= 0) return NaN
    return effectKind === 'r' ? nForCorr(e, a, pw) : nPerGroup(e, a, pw) * 2
  }, [form.effectSize, form.alpha, form.power, effectKind])

  // prereg plan values — fall back to anything written in the old Publish editor
  const legacy = planValues(project)
  const plans = {
    samplingPlan: form.samplingPlan ?? legacy.samplingPlan,
    analysisPlan: form.analysisPlan ?? legacy.analysisPlan,
    exclusions: form.exclusions ?? legacy.exclusions,
  }
  const locked = !!(form.preregText && form.preregLockedAt)

  function lockPrereg() {
    update({ ...plans, preregText: buildPrereg(project, plans), preregLockedAt: Date.now() })
  }
  function unlockPrereg() {
    const sure = window.confirm(
      'Unlock the preregistration?\n\nA preregistration only means something if it stays frozen before data collection. If you have already collected data, revise transparently and report the change as a deviation in the write-up.',
    )
    if (sure) update({ preregText: undefined, preregLockedAt: undefined })
  }
  function copyPrereg() {
    const text = form.preregText || buildPrereg(project, plans)
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }

  // ── ✦ AI plan draft — fills EMPTY plans only, from the study's own facts ──
  // Grounded on what the researcher already framed (question, hypotheses,
  // design, instrument, target N); the prompt forbids invented citations or
  // statistics, and the notice marks the result a draft to verify.
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'offline' | 'error'>('idle')
  const [aiFilled, setAiFilled] = useState<string[]>([])

  async function draftPlansWithAI() {
    if (aiStatus === 'loading') return
    setAiStatus('loading')
    const targetN = form.targetN || (Number.isFinite(suggestedN) ? String(suggestedN) : '')
    const prompt = [
      'You are helping a researcher write the three preregistration plans for a quantitative social-science study.',
      `Research question: ${project.question || '(not framed yet)'}`,
      frame.hypotheses?.length
        ? `Hypotheses:\n${frame.hypotheses.filter(Boolean).map((h, i) => `H${i + 1}: ${h}`).join('\n')}`
        : 'No hypotheses framed yet.',
      `Design: ${frame.design || 'not chosen yet'}`,
      scales.length
        ? `Instrument: ${scales.map((s) => `${s.name}${s.itemCount ? ` (${s.itemCount} items)` : ''}`).join('; ')}`
        : 'No instrument yet.',
      targetN ? `Target N: ${targetN}` : 'Target N not set yet.',
      'Rules: NEVER invent citations, author names, statistics, software versions, or empirical claims. Write concrete, checkable plans in plain prose: samplingPlan = who, how many, how recruited, stopping rule; analysisPlan = the confirmatory test per hypothesis with alpha; exclusions = attention checks, incompletes, outlier rule. Base everything ONLY on the facts above.',
    ].join('\n\n')
    const res = await generate(prompt, {
      schemaHint: '{"samplingPlan": string, "analysisPlan": string, "exclusions": string}',
      temperature: 0.4,
    })
    const d = (res.data && typeof res.data === 'object' ? res.data : null) as Record<string, unknown> | null
    if (!res.ok || !d) {
      setAiStatus(res.ok || res.reason === 'error' ? 'error' : 'offline')
      return
    }
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const filled: string[] = []
    const patch: Partial<CollectData> = {}
    for (const key of ['samplingPlan', 'analysisPlan', 'exclusions'] as const) {
      if (!plans[key].trim() && str(d[key])) {
        patch[key] = str(d[key])
        filled.push(key === 'samplingPlan' ? 'sampling plan' : key === 'analysisPlan' ? 'analysis plan' : 'exclusions')
      }
    }
    setAiFilled(filled)
    if (Object.keys(patch).length) update(patch)
    setAiStatus('done')
  }

  const ethicsDone = ETHICS_CHECKS.filter((c) => !!form[c.key]).length
  const fielding = form.status === 'Collecting' || form.status === 'Complete'
  const gateMissing = [
    !locked ? 'a locked preregistration' : '',
    ethicsDone < ETHICS_CHECKS.length ? `${ETHICS_CHECKS.length - ethicsDone} ethics check(s)` : '',
  ].filter(Boolean)

  const tools = stageDef('collect').tools

  return (
    <div className="bld">
      {/* sample size */}
      <section className="bld-section">
        <h2 className="bld-h">Target sample size</h2>
        <div className="bld-grid">
          <Field label="Effect to detect">
            <select className="disc-select" value={effectKind} onChange={(e) => update({ effectKind: e.target.value as 'd' | 'r' })}>
              <option value="d">Group difference (Cohen's d)</option>
              <option value="r">Correlation (r)</option>
            </select>
          </Field>
          <Field label={effectKind === 'r' ? 'Expected r' : "Expected d"}>
            <input className="bld-input" inputMode="decimal" value={form.effectSize ?? (effectKind === 'r' ? '0.30' : '0.50')} onChange={(e) => update({ effectSize: e.target.value })} />
          </Field>
          <Field label="α (two-tailed)">
            <input className="bld-input" inputMode="decimal" value={form.alpha ?? '0.05'} onChange={(e) => update({ alpha: e.target.value })} />
          </Field>
          <Field label="Power (1−β)">
            <input className="bld-input" inputMode="decimal" value={form.power ?? '0.80'} onChange={(e) => update({ power: e.target.value })} />
          </Field>
        </div>
        <div className="anz-stat-row" style={{ marginTop: 12 }}>
          <Stat label="Suggested total N" value={Number.isFinite(suggestedN) ? String(suggestedN) : '—'} />
        </div>
        <p className="anz-fineprint">
          Closed-form approximation (Cohen 1988{effectKind === 'r' ? ', Fisher-z' : ', normal approx'}). For exact power
          curves use ToolsScope. {effectKind === 'd' && 'Total across two equal groups.'}
        </p>
        {beyondPlanner.length > 0 && (
          <p className="anz-warn">
            ⚠ Your framed model includes {beyondPlanner.join(' and ')}. This planner covers only a two-group d and a
            bivariate r — interaction and indirect effects typically need substantially larger samples than either.
            Power the smallest effect you must detect, not the main effect.
          </p>
        )}
      </section>

      {/* instrument blueprint */}
      <section className="bld-section">
        <h2 className="bld-h">Survey blueprint</h2>
        {scales.length === 0 ? (
          <p className="bld-muted">No instrument yet — build one in the Measure stage and it will appear here.</p>
        ) : (
          <>
            <p className="bld-muted">
              {scales.length} {scales.length === 1 ? 'scale' : 'scales'} · {totalItems} items · ≈ {estMinutes} min to complete
            </p>
            <ol className="bld-blueprint">
              {scales.map((s, i) => (
                <li key={s.id}>
                  <span className="bld-bp-n">{i + 1}</span>
                  <span>{s.name}{s.abbreviation ? ` (${s.abbreviation})` : ''} — {s.itemCount} items{s.responseFormat ? `, ${s.responseFormat}` : ''}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* preregistration — locked BEFORE fielding */}
      <section className="bld-section">
        <div className="bld-section-head">
          <h2 className="bld-h" style={{ margin: 0 }}>Preregistration — lock it before the first participant</h2>
          {!locked && (
            <button className="btn btn-ghost btn-sm" onClick={draftPlansWithAI} disabled={aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'Drafting…' : '✦ Draft plans with AI'}
            </button>
          )}
        </div>
        {!locked && aiStatus === 'done' && aiFilled.length > 0 && (
          <p className="anz-warn">
            ✦ AI-drafted: {aiFilled.join(', ')}. Verify every line and edit freely before you lock — the prereg is
            yours, not the model's.
          </p>
        )}
        {!locked && aiStatus === 'done' && aiFilled.length === 0 && (
          <p className="anz-warn">✦ Nothing to fill — all three plans already have your own text. Clear one first to redraft it.</p>
        )}
        {!locked && aiStatus === 'offline' && (
          <p className="anz-warn">✦ The AI backends are unreachable right now — write the plans by hand, or try again later.</p>
        )}
        {!locked && aiStatus === 'error' && <p className="anz-warn">✦ The AI draft failed — try again, or write the plans by hand.</p>}
        {locked ? (
          <>
            <p className="prereg-locked">
              <Icon name="check" size={14} /> Locked {fmtLockDate(form.preregLockedAt!)} — the document below is
              frozen. File it at OSF / AsPredicted, then field the study. Any change from here on is a deviation:
              report it.
            </p>
            <pre className="prereg-pre">{form.preregText}</pre>
            <div className="bld-section-head" style={{ marginTop: 12 }}>
              <button className="btn btn-fill" onClick={copyPrereg}>
                <Icon name={copied ? 'check' : 'publish'} size={15} /> {copied ? 'Copied' : 'Copy preregistration'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={unlockPrereg}>
                Unlock to revise…
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="bld-muted">
              Pulled from your study so far: {frame.hypotheses?.length || 0} hypotheses · {frame.design || 'design TBD'} ·{' '}
              {scales.length} measures. Write the three plans, then lock — the timestamp is what makes it a
              preregistration.
            </p>
            <label className="bld-label">Sampling plan</label>
            <textarea className="bld-textarea" rows={3} value={plans.samplingPlan} onChange={(e) => update({ samplingPlan: e.target.value })} placeholder="Who, how many, how recruited, stopping rule…" />
            <label className="bld-label">Analysis plan</label>
            <textarea className="bld-textarea" rows={3} value={plans.analysisPlan} onChange={(e) => update({ analysisPlan: e.target.value })} placeholder="The confirmatory test for each hypothesis, α, and any covariates…" />
            <label className="bld-label">Exclusion criteria</label>
            <textarea className="bld-textarea" rows={2} value={plans.exclusions} onChange={(e) => update({ exclusions: e.target.value })} placeholder="Attention checks, incomplete responses, outliers…" />
            <div className="bld-section-head" style={{ marginTop: 12 }}>
              <button className="btn btn-fill" onClick={lockPrereg}>
                <Icon name="publish" size={15} /> Lock preregistration
              </button>
              <button className="btn btn-ghost btn-sm" onClick={copyPrereg}>
                {copied ? 'Copied' : 'Copy draft'}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ethics & design checklist */}
      <section className="bld-section">
        <h2 className="bld-h">Ethics & design checks ({ethicsDone}/{ETHICS_CHECKS.length})</h2>
        <ul className="pub-checks">
          {ETHICS_CHECKS.map((c) => {
            const on = !!form[c.key]
            return (
              <li key={String(c.key)}>
                <button className={`pub-check ${on ? 'is-on' : ''}`} onClick={() => update({ [c.key]: !on } as Partial<CollectData>)} aria-pressed={on}>
                  <span className="pub-check-box">{on && <Icon name="check" size={13} />}</span>
                  {c.label}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="anz-fineprint">
          Consent is the last step of research ethics, not the whole of it — approval, data protection, and fair
          treatment come first.
        </p>
      </section>

      {/* consent */}
      <section className="bld-section">
        <h2 className="bld-h">Informed consent</h2>
        <textarea
          className="bld-textarea"
          rows={4}
          value={form.consentText ?? DEFAULT_CONSENT}
          onChange={(e) => update({ consentText: e.target.value })}
        />
        <p className="anz-fineprint">A consent gate is required before any collection — Cadence enforces this on the intro screen.</p>
      </section>

      {/* fielding status */}
      <section className="bld-section">
        <h2 className="bld-h">Fielding</h2>
        {fielding && gateMissing.length > 0 && (
          <p className="anz-error">
            ⚠ You are fielding without {gateMissing.join(' and ')}. Without a frozen prereg, every test becomes
            exploratory; without the ethics checks, the data may not be reportable at all.
          </p>
        )}
        <div className="bld-grid">
          <Field label="Mode">
            <select className="disc-select" value={form.mode ?? ''} onChange={(e) => update({ mode: e.target.value })}>
              <option value="">Choose…</option>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="disc-select" value={form.status ?? 'Not started'} onChange={(e) => update({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Target N">
            <input className="bld-input" inputMode="numeric" value={form.targetN ?? (Number.isFinite(suggestedN) ? String(suggestedN) : '')} onChange={(e) => update({ targetN: e.target.value })} />
          </Field>
          <Field label="Collected so far">
            <input className="bld-input" inputMode="numeric" value={form.collectedN ?? ''} onChange={(e) => update({ collectedN: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Start date">
            <input className="bld-input" type="date" value={form.startDate ?? ''} onChange={(e) => update({ startDate: e.target.value })} />
          </Field>
        </div>
      </section>

      <div className="disc-fulltools">
        <span className="disc-fulltools-label">Field it for real ↗</span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="anz-stat">
      <span className="anz-stat-v">{value}</span>
      <span className="anz-stat-l">{label}</span>
    </div>
  )
}
