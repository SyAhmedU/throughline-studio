import { FLOW, flowTitle, nextAction, reviewed, requirements, reviewStage, archivedReadiness, isMetaStudy } from '../lib/studyFlow'
import { getProject, saveProject, setStageData } from '../lib/store'
import type { Project, StageId } from '../lib/types'
import './StudyJourney.css'

export function StudyJourney({ project: p, onPick }: { project: Project; onPick: (id: StageId) => void }) {
  const next = nextAction(p)
  const missing = next ? requirements(p, next).find(r => !r.met)?.label : ''
  return <section className="study-journey" aria-label="Study journey">
    <div className="journey-heading"><div><span className="journey-kicker">One study · one working record</span><h2>{next ? `Next: ${flowTitle(p, next)}` : 'All checkpoints reviewed'}</h2><p>{missing || (next ? 'Review the work in this step, then continue.' : 'Keep the submission record current. Changes reopen affected checkpoints.')}</p></div>{next && <button className="btn btn-fill" onClick={() => onPick(next)}>Continue study →</button>}</div>
    <details className="journey-overview"><summary>{FLOW.filter(id => reviewed(p, id)).length}/7 checkpoints reviewed by you <span>View study overview</span></summary>
      <ol className="journey-review-list">{FLOW.map(id => {
        const list = requirements(p, id), done = reviewed(p, id), stale = !!p.journey?.reviews[id] && !done
        return <li key={id}><button onClick={() => onPick(id)}><strong>{flowTitle(p, id)}</strong><span>{done ? 'Reviewed' : stale ? 'Review reopened' : `${list.filter(r => r.met).length}/${list.length} requirements recorded`}</span><span aria-hidden="true">→</span></button></li>
      })}</ol><small>Upstream edits reopen affected reviews. These are author checkpoints, not external approvals.</small>
    </details>
  </section>
}

export function Checkpoint({ project: p, stage, onChange, onPick }: { project: Project; stage: StageId; onChange: (p: Project) => void; onPick: (id: StageId) => void }) {
  const list = requirements(p, stage), done = reviewed(p, stage)
  const prior = FLOW.slice(0, FLOW.indexOf(stage)).find(id => !reviewed(p, id))
  const stale = p.journey?.reviews[stage] && !done
  return <div className="side-card checkpoint" id="stage-checkpoint" tabIndex={-1}><h3 className="side-h3">Review & hand off</h3>
    <p>{done ? 'Reviewed. This work carries into the following steps.' : stale ? 'Work changed since your review. Check the updated evidence before continuing.' : 'Complete these items, then confirm your review.'}</p>
    <ul>{list.map((r, i) => <li key={i} data-met={r.met}><span aria-label={r.met ? 'Recorded:' : 'Missing:'}>{r.met ? '✓' : '○'}</span>{r.label}</li>)}</ul>
    {prior && <button className="btn btn-ghost btn-sm" onClick={() => onPick(prior)}>Review {flowTitle(p, prior)} first →</button>}
    <button className="btn btn-fill" disabled={!!prior || list.some(r => !r.met)} onClick={() => {
      const fresh = getProject(p.id) || p
      const next = reviewStage(fresh, stage)
      if (next === fresh) return
      const saved = saveProject(next); onChange(saved)
      const target = nextAction(saved); if (target) onPick(target)
    }}>{done ? 'Continue to next action' : 'Reviewed · continue →'}</button>
    <small>Your review is an author checkpoint, not external approval or registration.</small>
  </div>
}

/** Native fields share the existing stage data; no parallel protocol database. */
export function StudyContext({ project: p, stage, onChange }: { project: Project; stage: StageId; onChange: (p: Project) => void }) {
  const d = p.stages[stage].data
  function update(key: string, value: unknown) { const fresh = getProject(p.id) || p; onChange(setStageData(fresh, stage, { ...fresh.stages[stage].data, [key]: value })) }
  const field = (key: string, label: string, hint = '', rows = 4) => <label className="bld-field" key={key}><span className="bld-label">{label}</span>{hint && <small>{hint}</small>}<textarea aria-label={label} className="bld-textarea" rows={rows} value={typeof d[key] === 'string' ? d[key] as string : ''} onChange={e => update(key, e.target.value)} /></label>
  const locked = !!p.stages.collect.data.preregLockedAt
  if (stage === 'discover') return <section className="study-context"><h2>Evidence that frames this study</h2>{p.workingPaper?.documents.filter(v => v.kind === 'review').map(v => <details key={v.kind}><summary>Read your archived review draft</summary><pre>{v.text}</pre></details>)}{field('synthesis', 'Evidence synthesis / gap', 'Record what the sources support, what remains uncertain, and the gap this study will address.')}</section>
  if (stage === 'frame') return <section className="study-context"><h2>From evidence to a defensible plan</h2><label className="bld-field"><span className="bld-label">Study workflow</span><select className="disc-select" value={isMetaStudy(p) ? 'meta' : 'standard'} onChange={e => update('studyKind', e.target.value)}><option value="standard">Standard study — instruments / observations</option><option value="meta">Published-article study — coding / screening</option></select></label>{p.stages.discover.data.synthesis ? <details><summary>Evidence synthesis carried from Discover</summary><pre>{String(p.stages.discover.data.synthesis)}</pre></details> : <p>Record your evidence synthesis in Discover before reviewing this plan.</p>}{field('designPlan', 'Detailed design plan', 'Archived protocol wording is a proposal. Edit the plan here; select a design family below when applicable.')}{field('exploratoryRationale', 'Exploratory / descriptive rationale', 'Use this when directional hypotheses do not fit the research question.', 2)}</section>
  if (stage === 'measure') return <section className="study-context"><h2>{isMetaStudy(p) ? 'Operationalise your coding plan' : 'Prepare the actual instrument'}</h2>{field('sourcePlan', isMetaStudy(p) ? 'Coding manual and decision rules' : 'Measure / observation plan', 'Carried from your protocol where available. Naming a scale does not import or license its items.', 8)}{isMetaStudy(p) && field('reliabilityPlan', 'Coder agreement and pilot plan')}{field('readinessEvidence', isMetaStudy(p) ? 'Coding readiness evidence' : 'Instrument readiness evidence', isMetaStudy(p) ? 'Record the pilot, rule changes and coder arrangements, or explain unresolved items.' : 'Record item sources, permissions, adaptations and pilot evidence. Adaptations require their own validation.')}</section>
  if (stage === 'collect') {
    const values = (d.readinessEvidence || {}) as Record<string, string>
    return <section className="study-context"><h2>Before the study proceeds</h2><p>Keep a dated evidence note or reference for each requirement. If an item does not apply, record the rationale. These are your records, not verified external approvals.</p>
      {archivedReadiness(p).map((label, i) => <label className="bld-field" key={i}><span className="bld-label">{label}</span><input className="bld-input" aria-label={label} value={values[String(i)] || ''} placeholder="Reference / date / evidence, or reason not applicable" onChange={e => update('readinessEvidence', { ...values, [String(i)]: e.target.value })} /></label>)}
      {!p.workingPaper && field('readinessNote', 'Access, ethics and registration decisions')}
      {d.ethicsPlan ? <details><summary>Archived ethics proposal — not an approval</summary><pre>{String(d.ethicsPlan)}</pre></details> : null}
      {locked && <p>A local plan snapshot exists. Document deviations; a snapshot is not an external preregistration.</p>}
    </section>
  }
  if (stage === 'analyze') return <section className="study-context"><h2>Analyze against the recorded plan</h2><details><summary>Sampling, exclusions and analysis plan carried from Collect</summary><pre>{['samplingPlan', 'exclusions', 'analysisPlan'].map(k => String(p.stages.collect.data[k] || '(not recorded)')).join('\n\n')}</pre></details>{field('analysisReview', 'Diagnostics, deviations and interpretation', 'Document assumptions checked, missingness, departures from the plan and which results are exploratory. Captured outputs carry into Write.')}</section>
  return null
}
