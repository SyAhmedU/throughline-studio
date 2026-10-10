import assert from 'node:assert/strict'
import { restoredProjects } from './src/lib/backup.ts'

const disk = new Map<string, string>()
let denyWrite = false, denyRead = false
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(k: string) { if (denyRead) throw new Error('Blocked'); return disk.get(k) ?? null },
  setItem(k: string, v: string) { if (denyWrite && k === 'tls_projects') throw new Error('Quota'); disk.set(k, v) },
  removeItem(k: string) { disk.delete(k) },
} })
const store = await import('./src/lib/store.ts')
let p = store.createProject('SIMULATED save recovery', '')
denyWrite = true
p = store.saveProject({ ...p, question: 'SIMULATED latest question' })
store.setStageNotes(p, 'frame', 'SIMULATED retained note')
assert.equal(store.getStorageIssue(), 'write')
assert.equal(store.getProject(p.id)?.question, 'SIMULATED latest question')
assert.equal(store.getProject(p.id)?.stages.frame.notes, 'SIMULATED retained note')
assert.equal(JSON.parse(disk.get('tls_projects')!)[0].question, '')
assert.equal(store.hasUnsavedWork(), true)
const backup = JSON.stringify({ schema: 'throughline-backup-1', projects: store.loadProjects() })
const copies = restoredProjects(backup)
assert.notEqual(copies[0].id, p.id)
assert.equal(copies[0].question, p.question)
assert.equal(copies[0].stages.frame.notes, 'SIMULATED retained note')
assert.throws(() => restoredProjects(JSON.stringify({ ...p, stages: {} })))
assert.throws(() => restoredProjects(JSON.stringify({ schema: 'throughline-backup-1', projects: [p, {}] })))
denyWrite = false
store.retrySave()
assert.equal(store.hasUnsavedWork(), false)
assert.equal(store.getStorageIssue(), null)
assert.equal(JSON.parse(disk.get('tls_projects')!)[0].stages.frame.notes, 'SIMULATED retained note')
store.saveProject(copies[0])
assert.equal(store.loadProjects().length, 2)
assert.equal(store.getProject(p.id)?.title, 'SIMULATED save recovery')
// Previously valid work remains recoverable if the stored payload becomes malformed.
disk.set('tls_projects', '{broken')
assert.equal(store.loadProjects().length, 2)
assert.equal(store.getStorageIssue(), 'invalid')
store.createProject('SIMULATED new work during recovery', '')
assert.equal(disk.get('tls_projects'), '{broken')
assert.equal(store.getUnreadableBackup(), '{broken')
assert.equal(store.loadProjects().length, 3)
// A fresh session with inaccessible storage must not silently replace hidden work.
const blocked = await import('./src/lib/store.ts?blocked')
denyRead = true
blocked.createProject('SIMULATED blocked storage', '')
assert.equal(blocked.getStorageIssue(), 'read')
assert.equal(blocked.loadProjects().length, 1)
assert.equal(disk.get('tls_projects'), '{broken')
console.log('PASS: quota recovery, latest edits, retry, backup copies, invalid import, corrupt and blocked storage')
