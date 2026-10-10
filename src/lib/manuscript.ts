import type { Project } from './types'
import type { SavedScale } from './scales'

/** Always a planning scaffold: targets and catalogue reliability are not study results. */
export function plannedMethods(project: Project, scales: SavedScale[] = []): string {
  const f = project.stages.frame.data, m = project.stages.measure.data, c = project.stages.collect.data
  const parts = ['PLANNED METHOD — author draft. Reconcile with the procedures actually completed before submission.']
  const add = (heading: string, value: unknown) => { if (typeof value === 'string' && value.trim()) parts.push(`${heading}\n${value.trim()}`) }
  add('Design', f.designPlan || f.design)
  add('Sampling plan', c.samplingPlan)
  if (c.targetN) parts.push(`Planned sample target: ${c.targetN}. This is not the achieved sample.`)
  if (c.mode) parts.push(`Planned collection mode: ${c.mode}.`)
  add('Instrument / coding plan', m.sourcePlan)
  add('Coding agreement plan', m.reliabilityPlan)
  if (scales.length) parts.push('Selected catalogue measures (verify items, permissions and adaptation):\n' + scales.map(s => `${s.name} (${s.citation}).${s.alphaSummary ? ` Published catalogue reliability: ${s.alphaSummary}; not reliability estimated in this study.` : ''}`).join('\n'))
  add('Procedure plan', c.procedurePlan)
  add('Exclusions and missing-data rules', c.exclusions)
  add('Analysis plan', c.analysisPlan)
  return parts.length > 1 ? parts.join('\n\n') : ''
}

export function manuscriptText(p: Project): string {
  const w = p.stages.write.data
  const sections = [['abstract', 'Abstract'], ['intro', 'Introduction'], ['methods', 'Method'], ['results', 'Results'], ['discussion', 'Discussion'], ['credit', 'Author contributions'], ['coi', 'Declarations'], ['references', 'References']]
  return [`# ${w.title || p.title}`, ...sections.filter(([key]) => typeof w[key] === 'string' && String(w[key]).trim()).map(([key, title]) => `## ${title}\n\n${w[key]}`)].join('\n\n')
}
