import { useRef, useState } from 'react'
import type { Project } from '../lib/types'
import { getProject, setStageData } from '../lib/store'
import { deliveryIssues, downloadText, responseLetter, reviewReport, revisionComplete, revisionItems, studyPackageFiles, type RevisionItem } from '../lib/researchDelivery'
import './ResearchDelivery.css'

export function ResearchDelivery({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const exporting = useRef(false)
  const items = revisionItems(project), issues = deliveryIssues(project)
  function save(items: RevisionItem[]) {
    const fresh = getProject(project.id) || project
    onChange(setStageData(fresh, 'publish', { ...fresh.stages.publish.data, revisions: items }))
  }
  function edit(id: string, patch: Partial<RevisionItem>) {
    const fresh = getProject(project.id) || project
    save(revisionItems(fresh).map(item => {
      if (item.id !== id) return item
      const next = { ...item, ...patch, at: Date.now() }
      if (next.status === 'addressed' && (!next.comment.trim() || !next.response.trim() || !next.location.trim())) next.status = 'drafted'
      if (patch.status !== 'addressed' && item.status === 'addressed') next.status = 'drafted'
      return next
    }))
  }
  async function exportPackage() {
    if (exporting.current) return
    exporting.current = true; setBusy(true); setMessage('Preparing the current study package…')
    try {
      const snapshot = structuredClone(getProject(project.id) || project)
      const files = await studyPackageFiles(snapshot)
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (const [name, text] of Object.entries(files)) zip.file(name, text)
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob), a = document.createElement('a')
      a.href = url; a.download = 'throughline-study-package.zip'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Study package downloaded. It contains private study data; review it before sharing.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'The package could not be created. Your study has not been changed.') }
    finally { exporting.current = false; setBusy(false) }
  }
  return <>
    <section className="study-context delivery-panel" aria-labelledby="handoff-title">
      <p className="delivery-kicker">From workspace to submission</p><h2 id="handoff-title">Study handoff</h2>
      <p>Take your manuscript, protocol, saved evidence, review checklist and response record together. The complete study backup is included.</p>
      <div className="delivery-actions"><button className="btn btn-fill" disabled={busy} onClick={exportPackage}>{busy ? 'Building package…' : 'Download study package (.zip)'}</button><button className="btn btn-ghost" onClick={() => downloadText(reviewReport(getProject(project.id) || project), 'study-review-checklist.md')}>Export review checklist</button></div>
      <small>Includes any saved data and transcripts. Review confidentiality and reuse permissions before sharing. No submission is sent.</small>
      {message && <p role="status">{message}</p>}
      <details className="delivery-checks"><summary>{issues.length ? `${issues.length} items to inspect before handoff` : 'No missing items detected by these limited checks'}</summary><p>Checks of saved fields and author reviews, not certification of research quality or journal compliance.</p>{issues.map((issue, i) => <a key={i} href={`#/p/${project.id}/${issue.stage}`}><strong>{issue.label}</strong><span>{issue.detail}</span></a>)}</details>
    </section>
    <section className="study-context delivery-panel" aria-labelledby="responses-title">
      <div className="delivery-section-head"><div><p className="delivery-kicker">Revise with a record</p><h2 id="responses-title">Reviewer responses</h2></div><span>{items.filter(revisionComplete).length}/{items.length} addressed</span></div>
      <p>Record each comment verbatim, write your response and identify the manuscript change—or your reason for making no change. Editing an addressed response reopens it.</p>
      {!items.length && <p className="delivery-empty">No reviewer comments recorded. Add them when you receive a decision.</p>}
      {items.map((item, index) => <fieldset className="revision-item" key={item.id}><legend>Comment {index + 1}</legend>
        <label>Reviewer / round<input aria-label="Reviewer / round" value={item.reviewer} onChange={e => edit(item.id, { reviewer: e.target.value })} placeholder="e.g. Reviewer 1 · round 1"/></label>
        <label>Reviewer comment<textarea aria-label="Reviewer comment" rows={3} value={item.comment} onChange={e => edit(item.id, { comment: e.target.value })}/></label>
        <label>Author response<textarea aria-label="Author response" rows={4} value={item.response} onChange={e => edit(item.id, { response: e.target.value })}/></label>
        <label>Manuscript location / no-change rationale<input aria-label="Manuscript location / no-change rationale" value={item.location} onChange={e => edit(item.id, { location: e.target.value })} placeholder="Section, page / line, or reason no change was made"/></label>
        <div className="delivery-actions"><label>Response status<select value={item.status} onChange={e => edit(item.id, { status: e.target.value as RevisionItem['status'] })}><option value="open">Open</option><option value="drafted">Response drafted</option><option value="addressed" disabled={!item.comment.trim() || !item.response.trim() || !item.location.trim()}>Addressed by author</option></select></label><button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Remove this reviewer comment and response?')) save(revisionItems(getProject(project.id) || project).filter(r => r.id !== item.id)) }}>Remove comment {index + 1}</button></div>
      </fieldset>)}
      <div className="delivery-actions"><button className="btn btn-fill" onClick={() => save([...revisionItems(getProject(project.id) || project), { id: crypto.randomUUID(), reviewer: '', comment: '', response: '', location: '', status: 'open', at: Date.now() }])}>Add reviewer comment</button><button className="btn btn-ghost" disabled={!items.length} onClick={() => downloadText(responseLetter(getProject(project.id) || project), 'reviewer-responses.md')}>Export responses</button></div>
    </section>
  </>
}
