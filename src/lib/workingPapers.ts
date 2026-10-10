import { getProject, saveProject } from './store'
import { STAGE_IDS } from './stages'
import type { Project } from './types'

const pending = new Map<string, Promise<Project>>()

/** Only first-party, published archive IDs are accepted. Revisiting resumes without overwriting edits. */
export function continueWorkingPaper(id: string): Promise<Project> {
  if (!/^paper-\d{1,2}-(sep|oct|nov|dec)-2024$/.test(id)) return Promise.reject(new Error('Unknown working paper. Open it from the papers desk.'))
  const existing = getProject(`wp_${id}`)
  if (existing) return Promise.resolve(existing)
  const active = pending.get(id)
  if (active) return active
  const task = (async () => {
    const response = await fetch(`/working-papers/${id}.json`)
    if (!response.ok) throw new Error('This paper could not be loaded. Your existing projects are unchanged.')
    const text = await response.text()
    if (text.length > 2_000_000) throw new Error('Source pack is too large.')
    const pack = JSON.parse(text)
    if (pack.schema !== 'working-paper-1' || pack.id !== id || typeof pack.title !== 'string' || typeof pack.question !== 'string' || !Array.isArray(pack.documents) || !pack.documents.length || pack.documents.length > 3) throw new Error('Invalid working-paper pack.')
    for (const d of pack.documents) {
      if (!['review', 'protocol', 'ethics'].includes(d.kind) || typeof d.text !== 'string' || !/^[a-f0-9]{64}$/.test(d.sha256) || d.url !== `https://syed-papers.vercel.app/#/${id}/${d.kind}`) throw new Error('Invalid source document.')
      const bytes = new TextEncoder().encode(d.text)
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
      if (hash !== d.sha256) throw new Error('Source document failed its integrity check.')
    }
    // A concurrent request may already have stored the same deterministic project ID.
    const latest = getProject(`wp_${id}`)
    if (latest) return latest
    const ts = Date.now()
    const stages = Object.fromEntries(STAGE_IDS.map(stage => [stage, {
      status: stage === 'frame' ? 'active' : 'todo', notes: '', updatedAt: ts, data: {},
    }])) as Project['stages']
    const project = saveProject({
      id: `wp_${id}`, title: pack.title, question: pack.question, field: 'Organizational research',
      current: 'frame', createdAt: ts, updatedAt: ts, stages,
      workingPaper: { id, url: `https://syed-papers.vercel.app/#/${id}/protocol`, importedAt: ts, documents: pack.documents },
    })
    if (!getProject(project.id)) throw new Error('Browser storage is full or unavailable. Export existing work and free space before importing this paper.')
    return project
  })()
  pending.set(id, task)
  void task.finally(() => pending.delete(id)).catch(() => {})
  return task
}
