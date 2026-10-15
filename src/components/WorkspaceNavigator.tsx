import { useEffect, useRef, useState } from 'react'
import { FLOW, flowTitle, requirements, reviewed } from '../lib/studyFlow'
import { carrySummary } from '../lib/artifacts'
import type { Project, StageId } from '../lib/types'

/** Local navigation only. No project text leaves the device. */
export function WorkspaceNavigator({ project, onPick }: { project: Project; onPick: (stage: StageId) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  function open() {
    if (dialog.current?.open) return
    opener.current = document.activeElement as HTMLElement
    setQuery('')
    dialog.current?.showModal()
    input.current?.focus()
  }
  function close() { dialog.current?.close(); opener.current?.focus() }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open], [role="dialog"]')) {
        event.preventDefault(); open()
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])
  const entries = FLOW.map(id => ({ id, title: flowTitle(project, id), carry: carrySummary(project, id), requirements: requirements(project, id) }))
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const matches = entries.filter(entry => {
    const text = [entry.title, entry.carry, ...entry.requirements.map(r => r.label), project.stages[entry.id].notes].join(' ').toLocaleLowerCase()
    return terms.every(term => text.includes(term))
  })
  return <>
    <button className="btn btn-ghost btn-sm ws-jump" onClick={open} aria-haspopup="dialog">Jump to… <kbd>⌘ / Ctrl K</kbd></button>
    <dialog ref={dialog} className="ws-navigator" aria-labelledby="navigator-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="ws-navigator-inner">
        <div className="ws-navigator-heading"><h2 id="navigator-title">Find your place</h2><button className="btn btn-ghost btn-sm" onClick={close}>Close</button></div>
        <p>Search stages, evidence summaries, review requirements and your working notes.</p>
        <label className="ws-search-label">Search this study<input ref={input} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try: methods, exclusions, references…" onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>('.ws-nav-result')?.focus() }
          if (e.key === 'Enter' && matches.length) { e.preventDefault(); close(); onPick(matches[0].id) }
        }}/></label>
        <p className="ws-navigator-count" role="status">{matches.length} matching stages · this study only</p>
        <div className="ws-nav-results">{matches.map(entry => <button className="ws-nav-result" key={entry.id} onClick={() => { close(); onPick(entry.id) }}>
          <span><strong>{entry.title}</strong><small>{entry.carry || 'No evidence summary yet'}</small></span>
          <span>{reviewed(project, entry.id) ? 'Reviewed' : 'Open'} →</span>
        </button>)}{!matches.length && <p>No matching stage. Try a shorter phrase or a review requirement.</p>}</div>
        <small className="ws-navigator-hint">Enter opens the first match. Tab moves through results. Escape closes.</small>
      </div>
    </dialog>
  </>
}
