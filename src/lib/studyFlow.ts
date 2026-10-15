import type { Project, StageId } from './types'

export const FLOW: StageId[] = ['discover', 'frame', 'measure', 'collect', 'analyze', 'write', 'publish']
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
const count = (v: unknown) => Array.isArray(v) ? v.length : 0

/** Heading/body extraction only; source wording is never generated or rewritten. */
export function protocolSections(p: Project): Record<string, string> {
  const raw = p.workingPaper?.documents.find(d => d.kind === 'protocol')?.text || ''
  const source = raw.replace(/\r/g, '')
  return Object.fromEntries(source.split(/^## /m).slice(1).map(chunk => {
    const at = chunk.indexOf('\n')
    return [chunk.slice(0, at).replace(/^\d+\.\s*/, '').trim(), chunk.slice(at + 1).trim()]
  }))
}
export function isMetaStudy(p: Project): boolean {
  const kind = p.stages.frame.data.studyKind
  return kind ? kind === 'meta' : !!protocolSections(p)['Coding manual (core items)']
}
export function flowTitle(p: Project, id: StageId): string {
  if (isMetaStudy(p) && id === 'measure') return 'Coding plan'
  if (isMetaStudy(p) && id === 'collect') return 'Article collection'
  return ({ discover: 'Discover', frame: 'Frame', measure: 'Measure', collect: 'Collect', analyze: 'Analyze', write: 'Write', publish: 'Publish' })[id]
}

/** First import / explicit migration: fill empty fields only, never touch a frozen plan. */
export function seedArchivedPlan(p: Project): Project {
  if (!p.workingPaper || p.workingPaper.planVersion) return p
  if (p.stages.collect.data.preregLockedAt) return p
  const s = protocolSections(p)
  const next = structuredClone(p)
  const put = (stage: StageId, key: string, value: unknown) => {
    const old = next.stages[stage].data[key]
    if ((old == null || old === '' || (Array.isArray(old) && !old.length)) && value && (!Array.isArray(value) || value.length)) next.stages[stage].data[key] = value
  }
  put('frame', 'designPlan', s.Design)
  put('frame', 'hypotheses', s['Hypotheses (to be pre-registered)']?.split('\n').filter(l => /^- H\d/.test(l)).map(l => l.replace(/^- H\d+:?\s*/, '')))
  put('collect', 'samplingPlan', s['Sampling frame'] || [s['Population, eligibility and recruitment'], s['Sample size']].filter(Boolean).join('\n\n'))
  put('collect', 'analysisPlan', s.Analysis || s['Analysis plan'])
  put('measure', 'sourcePlan', s['Coding manual (core items)'] || s.Measures)
  put('measure', 'reliabilityPlan', s.Reliability)
  put('collect', 'procedurePlan', s['Procedure and timing'])
  put('collect', 'ethicsPlan', s.Ethics || s['Ethics (ICMR 2017 National Ethical Guidelines)'])
  // Eligibility is part of the archived sampling plan; the author supplies a distinct
  // operational exclusion/stopping rule. No inferred approvals, scale items or results.
  next.workingPaper!.planVersion = 1
  return next
}

export function archivedReadiness(p: Project): string[] {
  const s = protocolSections(p)
  return (s['Readiness checklist'] || s['Approvals and readiness checklist'] || '').split('\n')
    .filter(l => /^- \[[ x]\] /.test(l)).map(l => l.replace(/^- \[[ x]\] /, ''))
}

export interface Requirement { label: string; met: boolean }
export function requirements(p: Project, id: StageId): Requirement[] {
  const d = p.stages[id].data
  const has = (k: string) => !!text(d[k])
  const r = (label: string, met: boolean) => ({ label, met })
  switch (id) {
    case 'discover': return [r('Read and appraise the evidence', count(d.papers) > 0 || !!p.workingPaper?.documents.some(v => v.kind === 'review')), r('Record the evidence synthesis / gap', has('synthesis'))]
    case 'frame': return [r('State the research question', !!p.question.trim()), r('State the design and rationale', has('design') || has('designPlan') || isMetaStudy(p)), r('Record predictions or an exploratory rationale', count(d.hypotheses) > 0 || has('exploratoryRationale'))]
    case 'measure': return [r(isMetaStudy(p) ? 'Define codes and decision rules' : 'Specify the instrument / observation plan', has('sourcePlan') || count(d.scales) > 0), r('Record measurement / coding readiness evidence', has('readinessEvidence'))]
    case 'collect': {
      const readiness = d.readinessEvidence as Record<string, string> | undefined
      return [r('Define the sampling frame and stopping rule', has('samplingPlan')), r('Specify the analysis plan', has('analysisPlan')), r('Specify exclusions / missing-data rules', has('exclusions')), ...archivedReadiness(p).map((label, i) => r(label, !!text(readiness?.[String(i)]))), ...(!p.workingPaper ? [r('Record access, ethics and registration decisions', has('readinessNote'))] : [])]
    }
    case 'analyze': return [r('Capture results from your data or coded evidence', count(d.captures) > 0), r('Record diagnostics, deviations and interpretation', has('analysisReview'))]
    case 'write': return ['abstract', 'intro', 'methods', 'results', 'discussion', 'references'].map(k => r(`Draft ${k === 'intro' ? 'introduction' : k}`, has(k)))
    case 'publish': {
      const revisions = Array.isArray(d.revisions) ? d.revisions : []
      return [r('Choose a target journal', has('targetJournal')), r('Record author approval and journal requirements review', has('submissionReview')), r('Record submission / revision status', has('submissionStatus')),
        ...(revisions.length ? [r('Address recorded reviewer comments with responses and manuscript locations', revisions.every(item => item && item.status === 'addressed' && !!text(item.comment) && !!text(item.response) && !!text(item.location)))] : [])]
    }
  }
}

// Include only research-bearing fields. UI state and unrelated future work must not
// invalidate earlier reviews. Screening belongs to Collect though stored in Kitchen.
function stageEvidence(p: Project, id: StageId): unknown {
  const d = p.stages[id].data
  const keys: Record<StageId, string[]> = {
    discover: ['papers', 'synthesis'], frame: ['gap', 'design', 'designPlan', 'hypotheses', 'theory', 'iv', 'dv', 'mediators', 'moderators', 'exploratoryRationale', 'studyKind'],
    measure: ['scales', 'sourcePlan', 'reliabilityPlan', 'readinessEvidence'],
    collect: ['samplingPlan', 'analysisPlan', 'exclusions', 'procedurePlan', 'readinessEvidence', 'readinessNote', 'preregText', 'preregLockedAt', 'targetN', 'mode', 'collectedN', 'status'],
    analyze: ['dataset', 'captures', 'nativeRuns', 'analysisReview'],
    write: ['title', 'abstract', 'intro', 'methods', 'results', 'discussion', 'references', 'credit', 'coi'],
    publish: ['targetJournal', 'submissionReview', 'submissionStatus', 'submissionId', 'decisionDate', 'revisionPlan', 'revisions', 'osfUrl', 'preregistered', 'dataShared', 'materialsShared', 'dataUrl', 'materialsUrl'],
  }
  const evidence: Record<string, unknown> = Object.fromEntries(keys[id].map(k => [k, d[k] ?? null]))
  const k = p.stages.analyze.data.kitchen as Record<string, unknown> | undefined
  if (id === 'collect' && isMetaStudy(p)) evidence.screening = [k?.screening, k?.searchLog, k?.eligibility]
  if (id === 'analyze' && k) evidence.qualitative = [k.documents, k.codes, k.passages, k.joints, k.memos]
  if (id === 'frame') evidence.question = p.question
  if (id === 'discover') evidence.source = p.workingPaper?.documents.find(d => d.kind === 'review')?.sha256
  return evidence
}
/** Change detection, not a cryptographic or regulatory signature. */
export function flowFingerprint(p: Project, id: StageId): string {
  const input = JSON.stringify(FLOW.slice(0, FLOW.indexOf(id) + 1).map(s => stageEvidence(p, s)))
  let a = 2166136261, b = 5381
  for (let i = 0; i < input.length; i++) { a = Math.imul(a ^ input.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ input.charCodeAt(i) }
  return `${input.length}:${a >>> 0}:${b >>> 0}`
}
export function reviewed(p: Project, id: StageId): boolean {
  return requirements(p, id).every(r => r.met) && p.journey?.reviews[id]?.fingerprint === flowFingerprint(p, id)
}
export function nextAction(p: Project): StageId | null { return FLOW.find(id => !reviewed(p, id)) || null }
export function reviewStage(p: Project, id: StageId, at = Date.now()): Project {
  if (requirements(p, id).some(r => !r.met) || FLOW.slice(0, FLOW.indexOf(id)).some(s => !reviewed(p, s))) return p
  return { ...p, journey: { reviews: { ...p.journey?.reviews, [id]: { fingerprint: flowFingerprint(p, id), at } } }, stages: { ...p.stages, [id]: { ...p.stages[id], status: 'done' } } }
}
