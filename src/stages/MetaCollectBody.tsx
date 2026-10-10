import type { Project } from '../lib/types'
import { getProject, setStageData } from '../lib/store'
import { buildPrereg, planValues } from '../lib/prereg'
import { kitchenState } from '../lib/kitchen'
import ReviewBench from '../components/ReviewBench'
import '../components/ResearchKitchen.css'

/** Uses the same analysis Kitchen screening ledger, not a second review database. */
export function MetaCollectBody({ project: p, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const d = p.stages.collect.data, plans = planValues(p), locked = !!d.preregLockedAt
  function update(patch: Record<string, unknown>) { const fresh = getProject(p.id) || p; onChange(setStageData(fresh, 'collect', { ...fresh.stages.collect.data, ...patch })) }
  return <div className="bld"><section className="bld-section"><h2 className="bld-h">Article sampling & coding protocol</h2><p className="bld-muted">The units are published articles. Define the search and eligibility rules, document coding decisions, then bring the coded dataset into Analyze.</p>
    <fieldset disabled={locked} style={{ border: 0, padding: 0, display: 'grid', gap: 16 }}>{(['samplingPlan', 'analysisPlan', 'exclusions'] as const).map(key => <label className="bld-field" key={key}><span className="bld-label">{{ samplingPlan: 'Sampling frame, search window and stopping rule', analysisPlan: 'Analysis plan', exclusions: 'Eligibility, exclusions and missing / unclear codes' }[key]}</span><textarea className="bld-textarea" rows={5} value={plans[key]} onChange={e => update({ [key]: e.target.value })} /></label>)}</fieldset>
    <p className="anz-fineprint">A local snapshot records a plan version. File it with your chosen registry and retain the registry URL separately.</p>
    {locked ? <><details><summary>Read saved plan snapshot</summary><pre className="prereg-pre">{String(d.preregText || '')}</pre></details><button className="btn btn-ghost" onClick={() => {
      if (!window.confirm('Reopen the plan? The previous snapshot will remain in the project history. Record any deviations.')) return
      const fresh = getProject(p.id) || p, data = fresh.stages.collect.data
      update({ preregHistory: [...(Array.isArray(data.preregHistory) ? data.preregHistory : []), { text: data.preregText, lockedAt: data.preregLockedAt, unlockedAt: Date.now() }], preregText: '', preregLockedAt: undefined })
    }}>Reopen with version history</button></> : <button className="btn btn-fill" disabled={!Object.values(plans).every(v => v.trim())} onClick={() => { const fresh = getProject(p.id) || p; update({ preregText: buildPrereg(fresh, planValues(fresh)), preregLockedAt: Date.now() }) }}>Save local plan snapshot</button>}
  </section><div className="research-kitchen k-workspace"><ReviewBench project={p} state={kitchenState(p.stages.analyze.data.kitchen)} change={patch => {
    const fresh = getProject(p.id) || p
    onChange(setStageData(fresh, 'analyze', { ...fresh.stages.analyze.data, kitchen: { ...kitchenState(fresh.stages.analyze.data.kitchen), ...patch } }))
  }} /></div></div>
}
