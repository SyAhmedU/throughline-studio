// ============================================================================
// Throughline Studio — Collect stage workspace.
// Plan the data collection: a power-based target N (real Cohen approximations),
// a survey blueprint assembled from the Measure-stage instrument, consent text,
// and live collection status. Persists to project.stages.collect.data and
// hands off to Cadence to actually field the survey.
// ============================================================================

import { useMemo } from 'react'
import { Icon } from '../components/Icon'
import { nForCorr, nPerGroup } from '../lib/power'
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
}

const DEFAULT_CONSENT =
  'You are invited to take part in a research study. Participation is voluntary and anonymous; you may stop at any time without penalty. Your responses will be used for research purposes only and reported in aggregate. By continuing, you confirm that you are 18 or older and consent to participate.'

const MODES = ['Online panel', 'Online (self-recruited)', 'In-person / lab', 'Field', 'Mixed']
const STATUSES = ['Not started', 'Piloting', 'Collecting', 'Complete']

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
  const effectKind = form.effectKind || 'd'

  const scales = ((project.stages.measure?.data as { scales?: SavedScale[] })?.scales) || []
  const totalItems = scales.reduce((a, s) => a + (s.itemCount || 0), 0)
  const estMinutes = Math.max(1, Math.round((totalItems * 12) / 60)) // ~12s/item

  const suggestedN = useMemo(() => {
    const e = Number(form.effectSize)
    const a = Number(form.alpha) || 0.05
    const pw = Number(form.power) || 0.8
    if (!Number.isFinite(e) || e <= 0) return NaN
    return effectKind === 'r' ? nForCorr(e, a, pw) : nPerGroup(e, a, pw) * 2
  }, [form.effectSize, form.alpha, form.power, effectKind])

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
