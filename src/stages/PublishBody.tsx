// ============================================================================
// Throughline Studio — Publish stage workspace.
// Close the loop: assemble a preregistration from the study's accumulated plan
// (question, hypotheses, design, measures), track an open-science checklist,
// and hand off to ScholarScope (where to publish) and OSF (preregister + share).
// Persists to project.stages.publish.data. Real data only.
// ============================================================================

import { useState } from 'react'
import { Icon } from '../components/Icon'
import type { SavedScale } from '../lib/scales'
import { deepLink, stageDef } from '../lib/stages'
import type { SavedTheory } from '../lib/theories'
import { useStageData } from '../lib/useStageData'
import type { Project } from '../lib/types'

interface PublishData extends Record<string, unknown> {
  samplingPlan?: string
  analysisPlan?: string
  exclusions?: string
  preregistered?: boolean
  dataShared?: boolean
  materialsShared?: boolean
  openAccess?: boolean
  osfUrl?: string
  targetJournal?: string
}
interface FrameData {
  hypotheses?: string[]
  design?: string
  theory?: SavedTheory | null
}

const CHECKS: { key: keyof PublishData; label: string }[] = [
  { key: 'preregistered', label: 'Study preregistered (OSF / AsPredicted)' },
  { key: 'dataShared', label: 'Data shared in an open repository' },
  { key: 'materialsShared', label: 'Materials & analysis code shared' },
  { key: 'openAccess', label: 'Open-access publication planned' },
]

export function PublishBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [form, update] = useStageData<PublishData>(project, 'publish', onChange)
  const [copied, setCopied] = useState(false)

  const frame = (project.stages.frame?.data || {}) as FrameData
  const scales = ((project.stages.measure?.data as { scales?: SavedScale[] })?.scales) || []

  function prereg(): string {
    const out: string[] = [`# Preregistration — ${project.title}`]
    if (project.question) out.push(`\n## Research question\n${project.question}`)
    if (frame.hypotheses && frame.hypotheses.length)
      out.push(`\n## Hypotheses\n` + frame.hypotheses.map((h, i) => `H${i + 1}: ${h}`).join('\n'))
    if (frame.design) out.push(`\n## Design\n${frame.design}`)
    out.push(`\n## Sampling plan\n${form.samplingPlan || '(to write)'}`)
    if (scales.length)
      out.push(`\n## Measures\n` + scales.map((s) => `- ${s.name}${s.abbreviation ? ` (${s.abbreviation})` : ''}, ${s.itemCount} items (${s.citation})`).join('\n'))
    out.push(`\n## Analysis plan\n${form.analysisPlan || '(to write)'}`)
    out.push(`\n## Exclusion criteria\n${form.exclusions || '(to write)'}`)
    return out.join('\n')
  }
  function copyPrereg() {
    navigator.clipboard?.writeText(prereg()).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }

  const tools = stageDef('publish').tools
  const checksDone = CHECKS.filter((c) => form[c.key]).length

  return (
    <div className="bld">
      {/* preregistration */}
      <section className="bld-section">
        <h2 className="bld-h">Preregistration</h2>
        <p className="bld-muted">
          Pulled from your study so far: {frame.hypotheses?.length || 0} hypotheses · {frame.design || 'design TBD'} ·{' '}
          {scales.length} measures. Fill the rest, then copy it into OSF.
        </p>
        <label className="bld-label">Sampling plan</label>
        <textarea className="bld-textarea" rows={3} value={form.samplingPlan ?? ''} onChange={(e) => update({ samplingPlan: e.target.value })} placeholder="Who, how many, how recruited, stopping rule…" />
        <label className="bld-label">Analysis plan</label>
        <textarea className="bld-textarea" rows={3} value={form.analysisPlan ?? ''} onChange={(e) => update({ analysisPlan: e.target.value })} placeholder="The confirmatory tests for each hypothesis, α, and any covariates…" />
        <label className="bld-label">Exclusion criteria</label>
        <textarea className="bld-textarea" rows={2} value={form.exclusions ?? ''} onChange={(e) => update({ exclusions: e.target.value })} placeholder="Attention checks, incomplete responses, outliers…" />
        <div className="bld-section-head" style={{ marginTop: 12 }}>
          <button className="btn btn-fill" onClick={copyPrereg}>
            <Icon name={copied ? 'check' : 'publish'} size={15} /> {copied ? 'Copied prereg' : 'Assemble & copy preregistration'}
          </button>
        </div>
      </section>

      {/* open science checklist */}
      <section className="bld-section">
        <h2 className="bld-h">Open-science checklist ({checksDone}/{CHECKS.length})</h2>
        <ul className="pub-checks">
          {CHECKS.map((c) => {
            const on = !!form[c.key]
            return (
              <li key={String(c.key)}>
                <button className={`pub-check ${on ? 'is-on' : ''}`} onClick={() => update({ [c.key]: !on } as Partial<PublishData>)} aria-pressed={on}>
                  <span className="pub-check-box">{on && <Icon name="check" size={13} />}</span>
                  {c.label}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="bld-grid" style={{ marginTop: 12 }}>
          <Field label="OSF / preregistration URL">
            <input className="bld-input" value={form.osfUrl ?? ''} onChange={(e) => update({ osfUrl: e.target.value })} placeholder="https://osf.io/…" />
          </Field>
          <Field label="Target journal">
            <input className="bld-input" value={form.targetJournal ?? ''} onChange={(e) => update({ targetJournal: e.target.value })} placeholder="Find one in ScholarScope ↓" />
          </Field>
        </div>
      </section>

      <div className="disc-fulltools">
        <span className="disc-fulltools-label">Place it & open it up ↗</span>
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
