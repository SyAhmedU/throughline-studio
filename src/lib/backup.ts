import { STAGE_IDS } from './stages.ts'
import type { Project } from './types'

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function isProject(v: unknown): v is Project {
  if (!record(v) || !['id', 'title', 'field', 'question'].every(k => typeof v[k] === 'string') ||
    !v.id || !Number.isFinite(v.createdAt) || !Number.isFinite(v.updatedAt) ||
    !STAGE_IDS.includes(v.current as Project['current']) || !record(v.stages)) return false
  const stages = v.stages
  if (!STAGE_IDS.every(id => {
    const s = stages[id]
    return record(s) && ['todo', 'active', 'done'].includes(s.status as string) &&
      typeof s.notes === 'string' && Number.isFinite(s.updatedAt) && record(s.data)
  })) return false
  if (v.workingPaper !== undefined && (!record(v.workingPaper) || !Array.isArray(v.workingPaper.documents) ||
    !v.workingPaper.documents.every(d => record(d) && ['kind', 'text', 'sha256', 'url'].every(k => typeof d[k] === 'string')))) return false
  if (v.journey !== undefined && (!record(v.journey) || !record(v.journey.reviews))) return false
  return true
}

/** Validate the entire backup before writing anything. Restore copies, never overwrite. */
export function restoredProjects(text: string): Project[] {
  if (text.length > 20_000_000) throw new Error('Backup is larger than 20 MB')
  const value: unknown = JSON.parse(text)
  const projects = record(value) && value.schema === 'throughline-backup-1' ? value.projects : [value]
  if (!Array.isArray(projects) || !projects.length || !projects.every(isProject)) {
    throw new Error('Backup does not contain complete Throughline Studio projects')
  }
  return projects.map(p => ({ ...p, id: `restored_${crypto.randomUUID()}`, title: `${p.title} (restored copy)`, updatedAt: Date.now() }))
}

export function downloadJSON(value: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
