// ============================================================================
// Throughline Studio — Publish stage workspace.
// Close the loop: show the FROZEN preregistration (assembled + locked in the
// Collect stage, before fielding — never written here after the fact), track
// the open-science checklist, and hand off to ScholarScope (where to publish)
// and OSF (share data + materials). Persists to project.stages.publish.data.
// Real data only.
// ============================================================================

import { useState } from 'react'
import { Icon } from '../components/Icon'
import { fmtLockDate, preregLock } from '../lib/prereg'
import { deepLink, stageDef, toolLabel } from '../lib/stages'
import { useStageData } from '../lib/useStageData'
import type { Project } from '../lib/types'

interface PublishData extends Record<string, unknown> {
  preregistered?: boolean
  dataShared?: boolean
  materialsShared?: boolean
  openAccess?: boolean
  osfUrl?: string
  targetJournal?: string
  // legacy: plan fields once edited here now live in Collect (read via prereg.ts)
  samplingPlan?: string
  analysisPlan?: string
  exclusions?: string
}

const CHECKS: { key: keyof PublishData; label: string; hint?: string }[] = [
  {
    key: 'preregistered',
    label: 'Preregistration filed (OSF / AsPredicted) before data collection',
    hint: 'The prereg is assembled and locked in the Collect stage — a prereg written after the results is not a prereg.',
  },
  { key: 'dataShared', label: 'Data shared in an open repository' },
  {
    key: 'materialsShared',
    label: 'Materials & the analysis log shared',
    hint: 'Export the analysis log from the Analyze stage — it documents every test you captured.',
  },
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

  const lock = preregLock(project)

  function copyPrereg() {
    if (!lock) return
    navigator.clipboard?.writeText(lock.text).then(
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
      {/* the frozen preregistration */}
      <section className="bld-section">
        <h2 className="bld-h">Preregistration</h2>
        {lock ? (
          <>
            <p className="prereg-locked">
              <Icon name="check" size={14} /> Locked {fmtLockDate(lock.lockedAt)} in the Collect stage — frozen before
              fielding. This is the document of record; report any deviation from it in the paper.
            </p>
            <pre className="prereg-pre">{lock.text}</pre>
            <div className="bld-section-head" style={{ marginTop: 12 }}>
              <button className="btn btn-fill" onClick={copyPrereg}>
                <Icon name={copied ? 'check' : 'publish'} size={15} /> {copied ? 'Copied' : 'Copy frozen prereg'}
              </button>
            </div>
          </>
        ) : (
          <p className="bld-muted">
            No locked preregistration on this project. Preregistration happens <em>before</em> data collection —
            assemble and lock it in the{' '}
            <a href={`#/p/${project.id}/collect`}>Collect stage</a>, not here. If the data are already in, run the
            tests as planned but report them as exploratory.
          </p>
        )}
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
                  <span>
                    {c.label}
                    {c.hint && <span className="pub-check-hint">{c.hint}</span>}
                  </span>
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
