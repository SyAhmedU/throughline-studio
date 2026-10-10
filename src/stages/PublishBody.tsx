// ============================================================================
// Throughline Studio — Publish stage workspace.
// Close the loop: show the FROZEN preregistration (assembled + locked in the
// Collect stage, before fielding — never written here after the fact), track
// the open-science checklist, and hand off to ScholarScope (where to publish)
// and OSF (share data + materials). Persists to project.stages.publish.data.
// Real data only.
// ============================================================================

import { useState } from 'react'
import { manuscriptText } from '../lib/manuscript'
import { reviewed } from '../lib/studyFlow'
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
  submissionReview?: string
  submissionStatus?: string
  submissionId?: string
  decisionDate?: string
  revisionPlan?: string
  dataUrl?: string
  materialsUrl?: string
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
  const [needUrl, setNeedUrl] = useState(false)

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
      <section className="study-context"><h2>Submission & revision desk</h2><p>The manuscript is the same draft saved in Write. Keep the journal decision and revision plan beside the study evidence.</p>
        {!reviewed(project, 'write') && <p>Writing review is still open. The download remains a draft.</p>}
        <button className="btn btn-fill" disabled={!['intro','methods','results','discussion'].some(k => project.stages.write.data[k])} onClick={() => {
          const url = URL.createObjectURL(new Blob([manuscriptText(project)], { type: 'text/markdown;charset=utf-8' }))
          const a = document.createElement('a'); a.href = url; a.download = 'study-manuscript-draft.md'; a.click(); URL.revokeObjectURL(url)
        }}>Download current manuscript</button>
        <label className="bld-field"><span className="bld-label">Author approval and journal requirements review</span><textarea className="bld-textarea" rows={3} value={form.submissionReview || ''} onChange={e => update({ submissionReview: e.target.value })} placeholder="Record the journal instructions URL and review date, author approvals, reporting checklist, declarations and outstanding requirements." /></label>
        <label className="bld-field"><span className="bld-label">Submission status</span><select aria-label="Submission status" className="disc-select" value={form.submissionStatus || ''} onChange={e => update({ submissionStatus: e.target.value })}>{['', 'Preparing', 'Submitted', 'Under review', 'Revision requested', 'Accepted', 'Rejected', 'Withdrawn'].map(v => <option key={v} value={v}>{v || 'Not recorded'}</option>)}</select></label>
        <label className="bld-field"><span className="bld-label">Manuscript ID / submission reference</span><input className="bld-input" value={form.submissionId || ''} onChange={e => update({ submissionId: e.target.value })} /></label>
        <label className="bld-field"><span className="bld-label">Revision due / next follow-up date</span><input className="bld-input" type="date" value={form.decisionDate || ''} onChange={e => update({ decisionDate: e.target.value })} /></label>
        <label className="bld-field"><span className="bld-label">Reviewer comments and response plan</span><textarea className="bld-textarea" rows={4} value={form.revisionPlan || ''} onChange={e => update({ revisionPlan: e.target.value })} /></label>
        <a href={`#/p/${project.id}/write`}>Return to the manuscript for revisions →</a>
      </section>
      {/* the frozen preregistration */}
      <section className="bld-section">
        <h2 className="bld-h">Preregistration</h2>
        {lock ? (
          <>
            <p className="prereg-locked">
              <Icon name="check" size={14} /> Local snapshot saved {fmtLockDate(lock.lockedAt)} in Collect. This does not establish external registration or when data collection began. Retain the registry record and report deviations.
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
                <button
                  className={`pub-check ${on ? 'is-on' : ''}`}
                  onClick={() => {
                    // "filed" is a claim about an external registry — it needs
                    // the registry URL, not bare self-attestation (audit B16)
                    if (c.key === 'preregistered' && !on && !(form.osfUrl || '').trim()) {
                      setNeedUrl(true)
                      return
                    }
                    if (c.key === 'preregistered') setNeedUrl(false)
                    update({ [c.key]: !on } as Partial<PublishData>)
                  }}
                  aria-pressed={on}
                >
                  <span className="pub-check-box">{on && <Icon name="check" size={13} />}</span>
                  <span>
                    {c.label}
                    {c.hint && <span className="pub-check-hint">{c.hint}</span>}
                  </span>
                </button>
                {c.key === 'preregistered' && needUrl && (
                  <p className="anz-warn" style={{ marginTop: 6 }}>
                    Paste the OSF / AsPredicted URL below first — the filing is the registration; this checkbox is
                    just the bookkeeping.
                  </p>
                )}
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
        <div className="bld-grid" style={{ marginTop: 12 }}>
          <Field label="Data repository URL"><input className="bld-input" value={form.dataUrl || ''} onChange={e => update({ dataUrl: e.target.value })} /></Field>
          <Field label="Materials repository URL"><input className="bld-input" value={form.materialsUrl || ''} onChange={e => update({ materialsUrl: e.target.value })} /></Field>
        </div>
        {/* the availability statement journals ask for, assembled from the
            answers above — it changes as the checklist changes (audit B17) */}
        <p className="anz-fineprint" style={{ marginTop: 12 }}>
          <strong>Data-availability statement (from your answers above):</strong> {availabilityStatement(form)}
        </p>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigator.clipboard?.writeText(availabilityStatement(form)).catch(() => {})}
        >
          <Icon name="publish" size={14} /> Copy statement
        </button>
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

/** Availability statement built only from the user's own checklist answers —
 *  honest in both directions (says "not publicly available" when unchecked). */
function availabilityStatement(form: PublishData): string {
  const url = (form.osfUrl || '').trim()
  const parts: string[] = []
  parts.push(
    form.dataShared
      ? `The data supporting this study are openly available${form.dataUrl ? ` at ${form.dataUrl}` : ' (add the data repository URL)'}.`
      : 'Data availability has not been recorded; complete this statement before submission.',
  )
  parts.push(
    form.materialsShared
      ? `Study materials and the analysis log are shared${form.materialsUrl ? ` at ${form.materialsUrl}` : ' (add the materials repository URL)'}.`
      : 'Materials availability has not been recorded; complete this statement before submission.',
  )
  if (form.preregistered && url) parts.push(`The study was preregistered at ${url}.`)
  return parts.join(' ')
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="bld-field">
      <span className="bld-label">{label}</span>
      {children}
    </label>
  )
}
