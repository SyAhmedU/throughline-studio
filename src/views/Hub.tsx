import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import workingPapers from '../lib/workingPaperCatalog.json'
import { continueWorkingPaper } from '../lib/workingPapers'
import { FLOW, nextAction, flowTitle, requirements, reviewed } from '../lib/studyFlow'
import { Icon } from '../components/Icon'
import { VideoLightbox } from '../components/VideoLightbox'
import { navigate } from '../lib/router'
import { createProject, deleteProject, loadProjects, saveProject, subscribe } from '../lib/store'
import type { Project } from '../lib/types'
import { restoredProjects } from '../lib/backup'
import './ResearchHome.css'

const KitchenWelcome = lazy(() => import('../components/KitchenWelcome'))

const editedDate = (p: Project) => new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const reviewCount = (p: Project) => FLOW.filter(id => reviewed(p, id)).length
const resume = (p: Project) => navigate(`/p/${p.id}/${nextAction(p) || 'publish'}`)

export function Hub() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [showNew, setShowNew] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showRecipes, setShowRecipes] = useState(false)
  const [paperId, setPaperId] = useState(workingPapers[0]?.id || '')
  const [paperState, setPaperState] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [importError, setImportError] = useState('')
  function refresh() { setProjects(loadProjects()) }
  useEffect(() => subscribe(refresh), [])
  const ordered = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
  const current = ordered[0]
  const next = current ? nextAction(current) : null
  const missing = current && next ? requirements(current, next).filter(r => !r.met) : []
  const visible = ordered.filter(p => {
    const matches = `${p.title} ${p.question} ${p.field}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    const complete = nextAction(p) === null
    return matches && (filter === 'all' || (filter === 'reviewed' ? complete : !complete))
  })
  async function openPaper() {
    setPaperState('Opening study…')
    try { resume(await continueWorkingPaper(paperId)); setPaperState('') }
    catch (e) { setPaperState(e instanceof Error ? e.message : 'Could not open this paper.') }
  }
  async function importFile(file: File) {
    setImportError('')
    try {
      if (file.size > 20_000_000) throw new Error('Backup is larger than 20 MB')
      const copies = restoredProjects(await file.text())
      copies.forEach(saveProject)
      refresh()
      resume(copies[0])
    } catch (e) { setImportError(`Could not import: ${(e as Error).message}. Choose a Studio project or recovery backup.`) }
  }
  return <main className="hub research-home" id="main">
    <header className="rh-heading">
      <div><p className="rh-eyebrow">Throughline Studio / Your workspace</p>
        <h1>{current ? 'Move your research forward.' : 'A question worth pursuing.'}</h1>
        <p className="rh-intro">{current ? 'Your evidence, decisions and writing. One continuous study.' : 'Build a study from the first source to the final manuscript, with the evidence connected at every step.'}</p>
      </div>
      <button className="btn btn-fill" onClick={() => setShowNew(true)}><Icon name="plus" size={16}/> New research project</button>
    </header>

    {current ? <section className="rh-focus" aria-labelledby="resume-title">
      <div className="rh-focus-main">
        <p className="rh-eyebrow">Your active research journey</p>
        <h2 id="resume-title">{current.title}</h2>
        <p className="rh-question">{current.question || 'A working title is enough to begin. Shape the question as you read.'}</p>
        <div className="rh-meta"><span>{current.field || 'Research project'}</span><span>Edited {editedDate(current)}</span></div>
        <button className="btn btn-fill" onClick={() => resume(current)}>{next ? `Continue to ${flowTitle(current, next)}` : 'Open publication plan'} <Icon name="arrow" size={15}/></button>
        <ol className="rh-steps" aria-label="Study checkpoints">{FLOW.map((id, i) => <li key={id}>
          <button className={reviewed(current, id) ? 'is-reviewed' : next === id ? 'is-next' : ''} aria-current={next === id ? 'step' : undefined} onClick={() => navigate(`/p/${current.id}/${id}`)}>
            <span>{reviewed(current, id) ? '✓' : String(i + 1).padStart(2, '0')}</span>{flowTitle(current, id)}
          </button>
        </li>)}</ol>
      </div>
      <aside className="rh-next" aria-label="Next checkpoint">
        <p className="rh-eyebrow">{next ? 'Your next move' : 'Checkpoint review complete'}</p>
        <h3>{next ? flowTitle(current, next) : 'Keep the work moving'}</h3>
        {missing.length ? <ul>{missing.slice(0, 3).map(r => <li key={r.label}>{r.label}</li>)}</ul> : <p>{next ? 'The required fields are present. Review the evidence in this stage before marking it reviewed.' : 'All seven checkpoints have an author review. Track decisions and revisions in your publication plan.'}</p>}
        {missing.length > 3 && <p>+ {missing.length - 3} more requirements in this stage</p>}
        <div className="rh-review-count"><strong>{reviewCount(current)}<span> / 7</span></strong><span>checkpoints reviewed by you</span></div>
        <p className="rh-note">Reviews reflect your recorded checks. They do not establish study validity or journal acceptance.</p>
      </aside>
    </section> : <section className="rh-start" aria-label="Start a study">
      <p className="rh-eyebrow">From question to contribution</p>
      <h2>Give your next idea a place to grow.</h2>
      <p>Start with a working title, continue a prepared paper, or choose a method below. Your study begins without invented evidence or results.</p>
      <ol className="rh-start-steps">{['Discover evidence', 'Design the study', 'Analyze your data', 'Write & publish'].map((label, i) => <li key={label}><span>0{i + 1}</span>{label}</li>)}</ol>
    </section>}

    <section className="rh-projects" aria-labelledby="projects-title">
      <div className="shelf-head"><div><p className="rh-eyebrow">Your research shelf</p><h2 className="section-h2" id="projects-title">Studies <span className="rh-total">{projects.length}</span></h2></div>
        <label className="btn btn-ghost rh-import">Import backup<input type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importFile(file) }}/></label>
      </div>
      {importError && <p role="alert">{importError}</p>}
      {projects.length > 0 ? <>
        <div className="rh-tools"><label><span>Find a study</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, question or discipline"/></label>
          <label><span>Checkpoint status</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All studies</option><option value="active">Needs review</option><option value="reviewed">All checkpoints reviewed</option></select></label>
        </div>
        <p className="rh-result-count" role="status">{visible.length} of {projects.length} studies · latest edited first</p>
        {visible.length ? <div className="project-grid">{visible.map(p => <ProjectCard key={p.id} project={p} onDuplicate={() => {
          saveProject({ ...structuredClone(p), id: `p_${crypto.randomUUID()}`, title: `${p.title} (copy)`, createdAt: Date.now(), updatedAt: Date.now() }); refresh()
        }} onDelete={() => { if (confirm(`Delete “${p.title}”? This cannot be undone.`)) { deleteProject(p.id); refresh() } }}/>)}</div> : <div className="rh-empty"><h3>No studies match this view.</h3><p>Try a different phrase or checkpoint status.</p><button className="btn btn-ghost" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button></div>}
      </> : <p className="rh-empty">Your saved studies will appear here. You can also restore a Studio JSON backup.</p>}
    </section>

    <section className="rh-resources" aria-labelledby="resources-title">
      <div><p className="rh-eyebrow">Start from what you have</p><h2 className="section-h2" id="resources-title">A head start, when you need one.</h2></div>
      <details className="rh-resource"><summary><span><strong>Prepared working papers</strong><small>{workingPapers.length} source-backed starting points · review and protocol together</small></span><span aria-hidden="true">↗</span></summary>
        <div className="rh-resource-body"><p>Open the original question and source drafts as an editable study. Existing edits are preserved when you return.</p><div className="rh-archive-form"><label><span>Prepared working paper</span><select value={paperId} onChange={e => setPaperId(e.target.value)}>{workingPapers.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button className="btn btn-fill" disabled={paperState === 'Opening study…'} onClick={openPaper}>Continue selected study →</button></div>{paperState && <p role="status">{paperState}</p>}<a href="https://syed-papers.vercel.app/">Read original papers ↗</a></div>
      </details>
      <details className="rh-resource" onToggle={e => setShowRecipes(e.currentTarget.open)}><summary><span><strong>Research Kitchen</strong><small>From choosing the dish to serving the paper · recipes, ingredients and methods</small></span><span aria-hidden="true">↗</span></summary>{showRecipes && <Suspense fallback={<p className="rh-resource-body" role="status">Opening the recipe book…</p>}><KitchenWelcome projects={ordered}/></Suspense>}</details>
      <nav className="rh-links" aria-label="Research resources"><a href="#/map">Explore the knowledge graph <span>↗</span></a><a href="#/examples">Learn from worked examples <span>↗</span></a><button onClick={() => setShowTour(true)}>Watch the Studio tour <span>↗</span></button><a href="https://syahmedu.github.io/research-suite/#research-directory">All research libraries & tools <span>↗</span></a></nav>
    </section>
    <footer className="hub-foot"><span>Throughline Studio</span><span>Evidence → decisions → contribution</span></footer>
    {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={(title, field) => { const p = createProject(title.trim(), field.trim()); resume(p) }}/ >}
    {showTour && <VideoLightbox src="/tour.mp4" poster="/tour-poster.jpg" label="Product tour video" onClose={() => setShowTour(false)}/>}
  </main>
}

function ProjectCard({project, onDelete, onDuplicate}: {project: Project; onDelete: () => void; onDuplicate: () => void}) {
  const next = nextAction(project)
  const count = reviewCount(project)
  return <article className="project-card rh-card">
    <div className="rh-card-meta"><span>{project.field || 'Research project'}</span><time dateTime={new Date(project.updatedAt).toISOString()}>{editedDate(project)}</time></div>
    <h3><a href={`#/p/${project.id}/${next || 'publish'}`}>{project.title}</a></h3>
    <p className="rh-card-question">{project.question || 'Research question not yet recorded.'}</p>
    <div className="rh-card-progress" aria-label={`${count} of 7 checkpoints reviewed`}>{FLOW.map(id => <span key={id} className={reviewed(project, id) ? 'is-reviewed' : ''}/>)}</div>
    <p className="rh-card-next">{next ? `Next: ${flowTitle(project, next)}` : 'All checkpoints reviewed'} <span>{count}/7 reviewed</span></p>
    <div className="rh-card-actions"><button className="btn btn-ghost btn-sm" onClick={() => resume(project)}>Continue <Icon name="arrow" size={13}/></button><div><button className="icon-btn" aria-label={`Duplicate ${project.title}`} title="Duplicate study" onClick={onDuplicate}><Icon name="plus" size={15}/></button><button className="icon-btn" aria-label={`Delete ${project.title}`} title="Delete study" onClick={onDelete}><Icon name="trash" size={15}/></button></div></div>
  </article>
}

const FIELD_CHIPS = [
  'Organizational Behavior',
  'Management',
  'Psychology',
  'Human Resources',
  'Marketing',
  'Education',
]

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, field: string) => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const previousFocus = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    return () => previousFocus.current?.focus()
  }, [])
  const [title, setTitle] = useState('')
  const [field, setField] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={dialog} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-study-title" onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); onClose() }
        if (e.key === 'Tab') {
          const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [href], select, textarea, [tabindex="0"]')
          if (!controls?.length) return
          const first = controls[0], last = controls[controls.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }}>
        <h2 className="modal-title" id="new-study-title">Start your throughline</h2>
        <p className="modal-sub">Just a working title to begin — everything's editable later, and the whole A→Z workspace opens the moment you do.</p>
        <label className="field-label" htmlFor="np-title">
          Title
        </label>
        <input
          id="np-title"
          className="field-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Remote work & team cohesion"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) onCreate(title, field)
          }}
        />
        <label className="field-label" htmlFor="np-field">
          Field / discipline
        </label>
        <input
          id="np-field"
          className="field-input"
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="e.g. Organizational Behavior"
        />
        <div className="np-field-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
          {FIELD_CHIPS.map((f) => (
            <button
              key={f}
              type="button"
              className={`np-chip${field === f ? ' is-on' : ''}`}
              aria-pressed={field === f}
              onClick={() => setField(f)}
              style={{
                fontSize: 12.5,
                padding: '5px 11px',
                borderRadius: 999,
                cursor: 'pointer',
                border: '1px solid var(--line, rgba(128,128,128,.28))',
                background: field === f ? 'var(--accent, #F14575)' : 'transparent',
                color: field === f ? '#fff' : 'var(--ink-2, inherit)',
                transition: 'background .15s, color .15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-fill"
            disabled={!title.trim()}
            onClick={() => onCreate(title, field)}
          >
            Create & open <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
