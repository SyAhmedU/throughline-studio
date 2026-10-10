import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { FLOW, seedArchivedPlan, protocolSections, isMetaStudy, requirements, reviewed, reviewStage, nextAction } from './src/lib/studyFlow.ts'
import { plannedMethods, manuscriptText } from './src/lib/manuscript.ts'
import type { Project } from './src/lib/types.ts'

function project(file: string): Project {
  const pack = JSON.parse(readFileSync(`public/working-papers/${file}`, 'utf8'))
  return { id: `wp_${pack.id}`, title: pack.title, question: pack.question, field: '', current: 'frame', createdAt: 0, updatedAt: 0,
    workingPaper: { id: pack.id, url: pack.url, importedAt: 0, documents: pack.documents },
    stages: Object.fromEntries(FLOW.map(id => [id, { status: 'todo', notes: '', updatedAt: 0, data: {} }])) as Project['stages'] }
}
let meta = 0, participant = 0
for (const file of readdirSync('public/working-papers').filter(f => /^paper-.*\.json$/.test(f))) {
  const original = project(file), p = seedArchivedPlan(original), s = protocolSections(p)
  assert.deepEqual(p.workingPaper?.documents, original.workingPaper?.documents, 'source copies unchanged')
  assert.equal(p.stages.collect.data.analysisPlan, s.Analysis || s['Analysis plan'])
  assert.equal(p.stages.measure.data.sourcePlan, s['Coding manual (core items)'] || s.Measures)
  assert.ok(p.stages.collect.data.samplingPlan)
  assert.equal(nextAction(p), 'discover')
  assert.ok(FLOW.every(id => !reviewed(p, id)))
  assert.equal(p.stages.collect.data.preregLockedAt, undefined)
  assert.equal(p.stages.analyze.data.captures, undefined)
  assert.equal(p.stages.write.data.results, undefined)
  assert.equal(p.stages.measure.data.scales, undefined, 'instrument proposal is not imported items')
  isMetaStudy(p) ? meta++ : participant++
  const old = project(file); old.stages.collect.data.analysisPlan = 'RESEARCHER EDIT — preserve'
  assert.equal(seedArchivedPlan(old).stages.collect.data.analysisPlan, 'RESEARCHER EDIT — preserve')
  old.stages.collect.data.preregLockedAt = 123
  assert.deepEqual(seedArchivedPlan(old), old, 'no migration into frozen plans')
  assert.equal(seedArchivedPlan(p), p, 'migration idempotent')
  assert.match(plannedMethods(p), /^PLANNED METHOD/)
  assert.doesNotMatch(plannedMethods(p), /was recruited|design was used|We report all measures/)
}
assert.equal(meta, 5); assert.equal(participant, 17)
let p = seedArchivedPlan(project('paper-4-sep-2024.json'))
assert.equal(reviewStage(p, 'discover'), p, 'cannot review missing work')
p.stages.discover.data.synthesis = 'SIMULATED QA synthesis; not research evidence'
assert.equal(reviewStage(p, 'measure'), p, 'cannot skip prior reviews')
p = reviewStage(p, 'discover', 1)
assert.equal(nextAction(p), 'frame')
p.stages.frame.data.exploratoryRationale = 'SIMULATED QA descriptive rationale'
p = reviewStage(p, 'frame', 2)
assert.equal(nextAction(p), 'measure')
p.stages.measure.data.readinessEvidence = 'SIMULATED QA readiness'
p = reviewStage(p, 'measure', 3)
assert.equal(nextAction(p), 'collect')
p.stages.collect.data.exclusions = 'SIMULATED QA exclusions'
p.stages.collect.data.readinessEvidence = Object.fromEntries(requirements(p, 'collect').slice(3).map((_, i) => [i, 'SIMULATED QA reference']))
p = reviewStage(p, 'collect', 4)
assert.equal(nextAction(p), 'analyze')
p.stages.analyze.data.captures = [{ id: 'qa', apa: 'SIMULATED QA output only', at: 0 }]
p.stages.analyze.data.analysisReview = 'SIMULATED QA diagnostics'
p = reviewStage(p, 'analyze', 5)
assert.equal(nextAction(p), 'write')
for (const key of ['abstract','intro','methods','results','discussion','references']) p.stages.write.data[key] = `SIMULATED QA ${key}`
p = reviewStage(p, 'write', 6)
assert.equal(nextAction(p), 'publish')
p.stages.publish.data = { targetJournal: 'SIMULATED QA', submissionStatus: 'Preparing', submissionReview: 'SIMULATED QA author review' }
p = reviewStage(p, 'publish', 7)
assert.equal(nextAction(p), null)
p.stages.frame.data.designPlan = 'SIMULATED QA revised design'
assert.equal(reviewed(p, 'discover'), true)
assert.ok(FLOW.slice(1).every(id => !reviewed(p, id)), 'upstream changes invalidate downstream reviews')
assert.equal(nextAction(p), 'frame')
assert.match(manuscriptText(p), /SIMULATED QA results/)
assert.equal(requirements(seedArchivedPlan(project('paper-4-sep-2024.json')), 'collect').filter(r => !r.met).length, 6)
console.log('PASS 22 exact-source adapters (17 participant / 5 meta), preservation, frozen-plan protection, ordered checkpoints, upstream invalidation, no invented results/approvals, planned-method wording and same-record manuscript export.')
