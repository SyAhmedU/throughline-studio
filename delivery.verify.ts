import assert from 'node:assert/strict'
import { FLOW, flowFingerprint, requirements } from './src/lib/studyFlow.ts'
import { deliveryIssues, responseLetter, revisionComplete, studyPackageFiles } from './src/lib/researchDelivery.ts'
import { appendManuscriptVersion, captureManuscript, restoreManuscript } from './src/lib/manuscriptHistory.ts'
import type { Project } from './src/lib/types.ts'

const p: Project = { id: 'SIMULATED-QA', title: 'SIMULATED QA study', question: 'SIMULATED QA question', field: '', current: 'write', createdAt: 1, updatedAt: 1, stages: Object.fromEntries(FLOW.map(id => [id, { status: 'todo', notes: '', updatedAt: 1, data: {} }])) as Project['stages'] }
assert.equal(deliveryIssues(p).filter(i => /requirements missing/.test(i.label)).length, 7)
p.stages.write.data = { intro: 'SIMULATED α introduction\nExact words.', methods: 'PLANNED METHOD — simulated plan', results: 'SIMULATED result, not an empirical finding.' }
assert(deliveryIssues(p).some(i => i.label.includes('planning labels')))
assert(deliveryIssues(p).some(i => i.label.includes('no captured analysis')))
p.stages.analyze.data.captures = [{ id: 'qa', apa: 'SIMULATED output\nExact line.' }]
assert(!deliveryIssues(p).some(i => i.label.includes('no captured analysis')))
const r = { id: 'r1', at: 1, reviewer: 'SIMULATED reviewer', comment: 'SIMULATED exact comment', response: '', location: '', status: 'addressed' as const }
assert(!revisionComplete(r))
p.stages.publish.data.revisions = [r]
assert.equal(requirements(p, 'publish').at(-1)?.met, false, 'Unanswered comments keep the publish review open')
const before = flowFingerprint(p, 'publish')
r.response = 'SIMULATED exact response'; r.location = 'Methods, paragraph 2'
assert(revisionComplete(r)); assert.notEqual(flowFingerprint(p, 'publish'), before)
assert.equal(requirements(p, 'publish').at(-1)?.met, true)
assert(responseLetter(p).includes(r.response))
const writeBefore = flowFingerprint(p, 'write')
p.stages.write.data.versions = [captureManuscript(p, 'First draft', 1)]
assert.equal(flowFingerprint(p, 'write'), writeBefore, 'Saving history does not alter manuscript review evidence')
const first = (p.stages.write.data.versions as {id:string}[])[0].id
p.stages.write.data.intro = 'SIMULATED rewritten introduction'
const restored = restoreManuscript(p, first)
assert.equal(restored.intro, 'SIMULATED α introduction\nExact words.')
assert.equal((restored.versions as {fields:Record<string,string>}[])[0].fields.intro, 'SIMULATED rewritten introduction')
for (let n=0; n<15; n++) p.stages.write.data.versions = appendManuscriptVersion(p, `Version ${n}`)
assert.equal((p.stages.write.data.versions as unknown[]).length, 12)
const original = JSON.stringify(p)
const files = await studyPackageFiles(p, new Date('2026-10-15T00:00:00Z'))
assert.equal(files['study.throughline.json'], JSON.stringify(p, null, 2))
assert(files['manuscript.md'].includes('SIMULATED rewritten introduction'))
assert(files['analysis-record.json'].includes('SIMULATED output'))
assert.equal(JSON.stringify(p), original, 'Export must not mutate the study')
const manifest = JSON.parse(files['manifest.json'])
for (const file of manifest.files) {
  const bytes = new TextEncoder().encode(files[file.name])
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  assert.equal(file.sha256, Buffer.from(digest).toString('hex'))
  assert.equal(file.bytes, bytes.length)
}
assert.equal(Object.keys(files).length, manifest.files.length + 1)
console.log('PASS exact study package, hashes, no export mutation, honest missing-evidence checks, response completeness, review invalidation, manuscript restore safety and bounded history.')
