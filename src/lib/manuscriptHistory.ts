import type { Project } from './types'
export const DRAFT_FIELDS = ['title', 'abstract', 'intro', 'methods', 'results', 'discussion', 'references', 'credit', 'coi'] as const
export interface ManuscriptVersion { id: string; at: number; label: string; fields: Record<string, string> }
export function manuscriptVersions(p: Project): ManuscriptVersion[] {
  const v = p.stages.write.data.versions
  return Array.isArray(v) ? v.filter((x): x is ManuscriptVersion => !!x && typeof x.id === 'string' && typeof x.label === 'string' && Number.isFinite(x.at) && !!x.fields && typeof x.fields === 'object' && DRAFT_FIELDS.every(k => typeof x.fields[k] === 'string')) : []
}
export function captureManuscript(p: Project, label: string, at = Date.now()): ManuscriptVersion {
  return { id: crypto.randomUUID(), at, label: label.trim() || 'Manuscript snapshot', fields: Object.fromEntries(DRAFT_FIELDS.map(k => [k, typeof p.stages.write.data[k] === 'string' ? p.stages.write.data[k] : k === 'title' ? p.title : ''])) as Record<string, string> }
}
export function appendManuscriptVersion(p: Project, label: string): ManuscriptVersion[] {
  const versions = [captureManuscript(p, label), ...manuscriptVersions(p)].slice(0, 12)
  if (new TextEncoder().encode(JSON.stringify(versions)).length > 2_000_000) throw new Error('Manuscript history exceeds 2 MB. Export a study backup before saving another version.')
  return versions
}
export function restoreManuscript(p: Project, id: string): Record<string, unknown> {
  const target = manuscriptVersions(p).find(v => v.id === id)
  if (!target) throw new Error('That manuscript version is no longer available.')
  return { ...target.fields, versions: appendManuscriptVersion(p, 'Before restoring a previous draft') }
}
