import type { Project, StageId } from './types'
import { FLOW, flowTitle, requirements, reviewed } from './studyFlow.ts'
import { manuscriptText, plannedMethods } from './manuscript.ts'

export interface RevisionItem { id: string; reviewer: string; comment: string; response: string; location: string; status: 'open' | 'drafted' | 'addressed'; at: number }
export function revisionItems(p: Project): RevisionItem[] {
  const value = p.stages.publish.data.revisions
  return Array.isArray(value) ? value.filter((v): v is RevisionItem => !!v && typeof v === 'object' && ['id', 'reviewer', 'comment', 'response', 'location'].every(k => typeof v[k] === 'string') && ['open', 'drafted', 'addressed'].includes(v.status)) : []
}
export const revisionComplete = (r: RevisionItem) => r.status === 'addressed' && !!r.comment.trim() && !!r.response.trim() && !!r.location.trim()
export interface DeliveryIssue { stage: StageId; label: string; detail: string }
export function deliveryIssues(p: Project): DeliveryIssue[] {
  const issues: DeliveryIssue[] = []
  for (const stage of FLOW) {
    const missing = requirements(p, stage).filter(r => !r.met)
    if (missing.length) issues.push({ stage, label: `${flowTitle(p, stage)}: ${missing.length} requirements missing`, detail: missing.map(r => r.label).join('; ') })
    else if (!reviewed(p, stage)) issues.push({ stage, label: `${flowTitle(p, stage)} review is open`, detail: 'Required fields are recorded. Review their content before marking this checkpoint.' })
  }
  const w = p.stages.write.data, pub = p.stages.publish.data
  if (typeof w.methods === 'string' && /PLANNED METHOD|Planned sample target:/i.test(w.methods)) issues.push({ stage: 'write', label: 'Methods still contain planning labels', detail: 'Reconcile planned methods with the procedures actually completed. Do not simply remove the label.' })
  const captures = p.stages.analyze.data.captures
  if (typeof w.results === 'string' && w.results.trim() && (!Array.isArray(captures) || !captures.length)) issues.push({ stage: 'analyze', label: 'Results have no captured analysis attached', detail: 'Verify the written results against your original outputs. External analysis may be valid but is not attached here.' })
  if (!String(w.credit || '').trim()) issues.push({ stage: 'write', label: 'Author contributions not recorded', detail: 'Record the actual author roles and confirm with the authors.' })
  if (!String(w.coi || '').trim()) issues.push({ stage: 'write', label: 'Declarations not recorded', detail: 'Complete the declarations required by the target journal.' })
  for (const [claim, url, label] of [['dataShared', 'dataUrl', 'Data sharing'], ['materialsShared', 'materialsUrl', 'Materials sharing'], ['preregistered', 'osfUrl', 'Preregistration']] as const) {
    if (pub[claim] && !/^https?:\/\/\S+$/i.test(String(pub[url] || '').trim())) issues.push({ stage: 'publish', label: `${label} claim needs a repository or registry URL`, detail: 'Add the actual record. A URL is not independent verification of its contents or timing.' })
  }
  const open = revisionItems(p).filter(r => !revisionComplete(r)).length
  if (open) issues.push({ stage: 'publish', label: `${open} reviewer responses need attention`, detail: 'Record each response, the manuscript location or a reason no change was made, and your review status.' })
  return issues
}
export function responseLetter(p: Project): string {
  return [`# Reviewer response record — ${p.title}`, 'Author-authored draft. Verify every response and manuscript location before submitting.', ...revisionItems(p).map((r, i) => `## ${i + 1}. ${r.reviewer || 'Reviewer not recorded'}\n\nStatus: ${revisionComplete(r) ? 'Addressed by author' : 'Open / response in progress'}\n\n### Comment (as recorded)\n${r.comment || '(not recorded)'}\n\n### Author response\n${r.response || '(not recorded)'}\n\n### Manuscript location / no-change rationale\n${r.location || '(not recorded)'}`)].join('\n\n')
}
export function reviewReport(p: Project): string {
  const issues = deliveryIssues(p)
  return [`# Study handoff review — ${p.title}`, `Research question: ${p.question || '(not recorded)'}`, 'These are checks of recorded fields and current author reviews. They do not certify validity, source accuracy, ethics approval, registration, reporting-guideline compliance or journal acceptance.', ...FLOW.map(stage => `## ${flowTitle(p, stage)}\nAuthor review: ${reviewed(p, stage) ? 'current' : 'open'}\n${requirements(p, stage).map(r => `- [${r.met ? 'x' : ' '}] ${r.label}`).join('\n')}`), '## Items to inspect', ...(issues.length ? issues.map(i => `- ${i.label}: ${i.detail}`) : ['No missing items detected by these limited checks. An author and journal-specific review is still required.'])].join('\n\n')
}
/** Fixed filenames only; research content is never interpreted as a path. */
export async function studyPackageFiles(project: Project, now = new Date()): Promise<Record<string, string>> {
  const p = structuredClone(project)
  const json = JSON.stringify(p, null, 2)
  if (new TextEncoder().encode(json).length > 20_000_000) throw new Error('This study exceeds the 20 MB package limit. Export its JSON backup and large analysis files separately.')
  const files: Record<string, string> = {
    'README.md': `# ${p.title}\n\nExported ${now.toISOString()}\n\nPrivate study handoff: this package contains the full study record, including any saved data, transcripts and archived source drafts. Review permissions and remove confidential content before sharing.\n\n- study.throughline.json: full-fidelity Studio backup; import it as a separate copy.\n- manuscript.md: current author manuscript, unchanged.\n- planned-protocol.md: planning scaffold, not completed procedures.\n- review-checklist.md: recorded requirements and current author checkpoints.\n- reviewer-responses.md: comments and author responses, unchanged.\n- reading-list.json and analysis-record.json: saved evidence only.\n- manifest.json: SHA-256 hashes for file-integrity checks, not scientific validation.\n\nExternal PDFs, external reproduction ZIPs and unsaved provider results are not downloaded. Nothing is submitted to a journal or repository.`,
    'study.throughline.json': json,
    'manuscript.md': manuscriptText(p),
    'planned-protocol.md': plannedMethods(p) || 'No planned-method fields recorded.',
    'review-checklist.md': reviewReport(p),
    'reviewer-responses.md': responseLetter(p),
    'reading-list.json': JSON.stringify(p.stages.discover.data.papers || [], null, 2),
    'analysis-record.json': JSON.stringify(p.stages.analyze.data, null, 2),
  }
  const entries = await Promise.all(Object.entries(files).map(async ([name, content]) => {
    const bytes = new TextEncoder().encode(content)
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return { name, bytes: bytes.length, sha256: [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, '0')).join('') }
  }))
  files['manifest.json'] = JSON.stringify({ schema: 'throughline-study-package-1', projectId: p.id, exportedAt: now.toISOString(), files: entries }, null, 2)
  return files
}
export function downloadText(text: string, name: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
