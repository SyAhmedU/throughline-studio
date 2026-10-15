import { useState } from 'react'
import type { Project } from '../lib/types'
import { getProject } from '../lib/store'
import { appendManuscriptVersion, manuscriptVersions, restoreManuscript } from '../lib/manuscriptHistory'
import { manuscriptText } from '../lib/manuscript'
import { downloadText } from '../lib/researchDelivery'

const SECTIONS = [['abstract','Abstract'],['intro','Introduction'],['methods','Method'],['results','Results'],['discussion','Discussion'],['references','References']] as const
export function ManuscriptDesk({ project, onApply }: { project: Project; onApply: (patch: Record<string, unknown>) => void }) {
  const [label, setLabel] = useState(''), [message, setMessage] = useState('')
  const versions = manuscriptVersions(project)
  const words = (key: string) => String(project.stages.write.data[key] || '').trim().split(/\s+/).filter(Boolean).length
  return <section className="manuscript-desk" aria-label="Manuscript desk">
    <div className="manuscript-desk-heading"><div><p className="delivery-kicker">Build your contribution</p><h2>Your manuscript, taking shape.</h2></div><strong>{SECTIONS.reduce((sum, [key]) => sum + words(key), 0).toLocaleString()}<small>draft words</small></strong></div>
    <nav className="manuscript-outline" aria-label="Manuscript sections">{SECTIONS.map(([key, name]) => <button key={key} onClick={() => { const target = document.getElementById(`draft-${key}`); target?.scrollIntoView({ block: 'start', behavior: 'instant' }); target?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true }) }}><span className={words(key) ? 'has-draft' : ''} aria-hidden="true">{words(key) ? '●' : '○'}</span><strong>{name}</strong><small>{words(key)} words</small></button>)}</nav>
    <details className="manuscript-history"><summary>Draft history <span>{versions.length}/12 saved versions</span></summary><p>Save a named version before a major rewrite. Restoring keeps a snapshot of the current draft. Only the latest 12 versions are retained; export the study package for longer-term records.</p>
      <div className="manuscript-history-save"><label>Version name<input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Before supervisor feedback" maxLength={100}/></label><button className="btn btn-fill" onClick={() => { try { onApply({ versions: appendManuscriptVersion(getProject(project.id) || project, label) }); setLabel(''); setMessage('Manuscript version saved.') } catch(e) { setMessage((e as Error).message) } }}>Save manuscript version</button></div>
      {versions.map(version => <div className="manuscript-history-row" key={version.id}><div><strong>{version.label}</strong><time dateTime={new Date(version.at).toISOString()}>{new Date(version.at).toLocaleString()}</time></div><button className="btn btn-ghost btn-sm" onClick={() => { const p = structuredClone(getProject(project.id) || project); p.stages.write.data = version.fields; downloadText(manuscriptText(p), 'manuscript-version.md') }}>Download</button><button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Restore this manuscript version? Your current draft will be saved in history first.')) { try { onApply(restoreManuscript(getProject(project.id) || project, version.id)); setMessage('Draft restored. Review any affected checkpoints.') } catch(e) { setMessage((e as Error).message) } } }}>Restore</button></div>)}
      {message && <p role="status">{message}</p>}
    </details>
    <details className="manuscript-preview"><summary>Read the assembled draft</summary><pre>{manuscriptText(project)}</pre><button className="btn btn-ghost" onClick={() => downloadText(manuscriptText(getProject(project.id) || project), 'study-manuscript-draft.md')}>Download manuscript</button></details>
  </section>
}
