import { useEffect, useSyncExternalStore } from 'react'
import { getStorageIssue, getUnreadableBackup, hasUnsavedWork, loadProjects, retrySave, subscribe } from '../lib/store'
import { downloadJSON } from '../lib/backup'

export function SaveStatus() {
  const issue = useSyncExternalStore(subscribe, getStorageIssue)
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (hasUnsavedWork()) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])
  if (!issue) return null
  const backup = () => downloadJSON({ schema: 'throughline-backup-1', projects: loadProjects() }, 'throughline-recovery.json')
  const rawBackup = () => {
    const raw = getUnreadableBackup()
    if (raw === null) return
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'throughline-original-storage.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="save-recovery" aria-label="Save recovery">
    <div role="alert"><strong>{issue === 'write' ? 'Changes are not saved on this device.' : 'Saved work could not be read.'}</strong>
      <p>{issue === 'write' ? 'Your latest edits are available in this tab. Download a backup before closing, or free browser storage and retry.' : 'Your stored work has not been replaced. New edits stay in this tab; download a backup before closing.'}</p>
    </div>
    <div className="save-recovery-actions">
      <button className="btn btn-sm" onClick={backup}>Download recovery backup</button>
      {issue === 'write' && <button className="btn btn-ghost btn-sm" onClick={retrySave}>Retry saving</button>}
      {issue === 'invalid' && <button className="btn btn-ghost btn-sm" onClick={rawBackup}>Download original stored file</button>}
    </div>
  </section>
}
