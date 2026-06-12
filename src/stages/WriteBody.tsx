// ============================================================================
// Throughline Studio — Write stage workspace.
// An IMRaD manuscript assembler. Each section is a persisted draft; "Pull from
// project" buttons assemble Methods/Results/Intro/References from everything the
// project already accumulated (reading list, theory, instrument, captured
// analyses) — real data only, nothing invented. Assemble + copy the full draft,
// or hand off to JournalTime for AI drafting and journal styling.
// ============================================================================

import { useMemo, useState } from 'react'
import { generate } from '../lib/api'
import { readingList } from '../lib/corpus'
import type { SavedScale } from '../lib/scales'
import { deepLink, stageDef, toolLabel } from '../lib/stages'
import type { SavedTheory } from '../lib/theories'
import { useStageData } from '../lib/useStageData'
import type { Project } from '../lib/types'
import { Icon } from '../components/Icon'

interface WriteData extends Record<string, unknown> {
  title?: string
  abstract?: string
  intro?: string
  methods?: string
  results?: string
  discussion?: string
  references?: string
}

interface FrameData {
  gap?: string
  hypotheses?: string[]
  design?: string
  theory?: SavedTheory | null
}
interface Capture {
  apa: string
}

export function WriteBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [form, update] = useStageData<WriteData>(project, 'write', onChange)
  const [copied, setCopied] = useState<false | 'done' | 'empty'>(false)
  const [ai, setAi] = useState<'idle' | 'loading' | 'unavailable' | 'error'>('idle')

  // project artifacts (all real, already in the project)
  const frame = (project.stages.frame?.data || {}) as FrameData
  const scales = ((project.stages.measure?.data as { scales?: SavedScale[] })?.scales) || []
  const captures = (((project.stages.analyze?.data as { captures?: Capture[] })?.captures) || [])
  const papers = readingList(project)

  const drafts = useMemo(
    () => ({
      intro: introDraft(project.question, frame),
      methods: methodsDraft(frame, scales, project),
      results: captures.map((c) => c.apa).join('\n\n'),
      references: referencesDraft(frame, scales, papers),
    }),
    [project, frame, scales, captures, papers],
  )

  function assemble(): string {
    const out: string[] = [`# ${form.title || project.title}`]
    const sec = (h: string, body?: string) => out.push(`\n## ${h}\n${body || '_(to write)_'}`)
    if (form.abstract) out.push(`\n## Abstract\n${form.abstract}`)
    sec('Introduction', form.intro)
    sec('Method', form.methods)
    sec('Results', form.results)
    sec('Discussion', form.discussion)
    if (form.references) out.push(`\n## References\n${form.references}`)
    return out.join('\n')
  }

  function copyAll() {
    // An empty assemble must not report success — a novice will believe they
    // have a draft (audit finding, 2026-06-12).
    const hasContent = !!(form.abstract || form.intro || form.methods || form.results || form.discussion || form.references)
    if (!hasContent) {
      setCopied('empty')
      window.setTimeout(() => setCopied(false), 3200)
      return
    }
    navigator.clipboard?.writeText(assemble()).then(
      () => {
        setCopied('done')
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }

  async function aiAbstract() {
    setAi('loading')
    const prompt =
      `Write a concise (~160 word) academic abstract from these study facts. ` +
      `Do not invent statistics, citations, authors, or findings beyond what is given.\n` +
      `Question: ${project.question}\nGap: ${frame.gap || ''}\n` +
      `Hypotheses: ${(frame.hypotheses || []).join('; ')}\n` +
      `Theory: ${frame.theory?.name || ''}\n` +
      `Measures: ${scales.map((s) => s.name).join(', ')}\n` +
      `Results: ${captures.map((c) => c.apa).join(' ')}`
    const res = await generate(prompt, { temperature: 0.5 })
    if (!res.ok) {
      setAi(res.reason === 'unavailable' ? 'unavailable' : 'error')
      return
    }
    // The shared RF fallback returns { result } which may be a JSON object —
    // dig the abstract out of it; a 200 with nothing usable must surface as an
    // error, never as a silent no-op (audit finding, 2026-06-12).
    const text = res.text ?? extractDraftText(res.data)
    if (text) {
      update({ abstract: text })
      setAi('idle')
    } else {
      setAi('error')
    }
  }

  const tools = stageDef('write').tools

  return (
    <div className="bld">
      <Section label="Title">
        <input className="bld-input" value={form.title ?? project.title} onChange={(e) => update({ title: e.target.value })} />
      </Section>

      <Section
        label="Abstract"
        action={
          <button className="btn btn-ghost btn-sm" onClick={aiAbstract} disabled={ai === 'loading'}>
            ✨ {ai === 'loading' ? 'Drafting…' : 'AI draft'}
          </button>
        }
      >
        <textarea className="bld-textarea" rows={4} value={form.abstract ?? ''} onChange={(e) => update({ abstract: e.target.value })} placeholder="A short summary — or draft it with AI / write it last." />
        {ai === 'unavailable' && <p className="anz-fineprint">AI assist needs the deployed backend with a key — write it by hand or use JournalTime below.</p>}
        {ai === 'error' && <p className="anz-error">AI draft failed — try again or write it by hand.</p>}
      </Section>

      <Section label="Introduction" action={<PullBtn onClick={() => update({ intro: drafts.intro })} disabled={!drafts.intro} />}>
        <textarea className="bld-textarea" rows={5} value={form.intro ?? ''} onChange={(e) => update({ intro: e.target.value })} placeholder="The question, the gap, the theory, the hypotheses. “Pull from project” drafts a scaffold from your Frame stage." />
      </Section>

      <Section label="Method" action={<PullBtn onClick={() => update({ methods: drafts.methods })} disabled={!drafts.methods} />}>
        <textarea className="bld-textarea" rows={5} value={form.methods ?? ''} onChange={(e) => update({ methods: e.target.value })} placeholder="Design, participants, measures. “Pull from project” assembles this from Frame + Measure + Collect." />
      </Section>

      <Section label="Results" action={<PullBtn label="Pull from analysis" onClick={() => update({ results: drafts.results })} disabled={!drafts.results} />}>
        <textarea className="bld-textarea" rows={5} value={form.results ?? ''} onChange={(e) => update({ results: e.target.value })} placeholder="“Pull from analysis” drops in the APA write-ups you captured in the Analyze stage." />
        {captures.length === 0 && <p className="anz-fineprint">No captured results yet — run analyses in the Analyze stage and capture them.</p>}
      </Section>

      <Section label="Discussion">
        <textarea className="bld-textarea" rows={4} value={form.discussion ?? ''} onChange={(e) => update({ discussion: e.target.value })} placeholder="What the findings mean, limitations, what's next." />
      </Section>

      <Section label="References" action={<PullBtn onClick={() => update({ references: drafts.references })} disabled={!drafts.references} />}>
        <textarea className="bld-textarea bld-mono" rows={5} value={form.references ?? ''} onChange={(e) => update({ references: e.target.value })} placeholder="“Pull from project” lists your theory, scale, and reading-list citations (real records)." />
      </Section>

      <div className="bld-assemble">
        <button className="btn btn-fill" onClick={copyAll}>
          <Icon name={copied === 'done' ? 'check' : 'write'} size={15} /> {copied === 'done' ? 'Copied draft' : 'Assemble & copy full draft'}
        </button>
        {copied === 'empty' && (
          <p className="anz-warn">The draft is empty — nothing was copied. Write or pull the sections above first, then assemble.</p>
        )}
        <div className="disc-fulltools-row">
          {tools.map((t) => (
            <a key={t.name} className="disc-fulltool" href={deepLink(t, topic)} target="_blank" rel="noopener noreferrer">
              {toolLabel(t)} <Icon name="external" size={12} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The shared RF backend returns { result: <parsed JSON> } — when the model
 *  wraps the abstract in an object, dig the first plausible string out instead
 *  of dropping a successful response on the floor. */
function extractDraftText(data: unknown): string | null {
  if (typeof data === 'string') return data.trim() || null
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  for (const k of ['abstract', 'text', 'draft', 'content', 'summary', 'result']) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim().length > 40) return v.trim()
  }
  const first = Object.values(obj).find((v) => typeof v === 'string' && v.trim().length > 40)
  return typeof first === 'string' ? first.trim() : null
}

// ── draft assemblers (real project data only) ───────────────────────────────
function introDraft(question: string, f: FrameData): string {
  const parts: string[] = []
  if (question) parts.push(`This study asks: ${question}`)
  if (f.gap) parts.push(f.gap)
  if (f.theory) parts.push(`The study is framed through ${f.theory.name}${f.theory.acronym ? ` (${f.theory.acronym})` : ''} (${f.theory.citation}).`)
  if (f.hypotheses && f.hypotheses.length) parts.push(f.hypotheses.map((h, i) => `H${i + 1}: ${h}`).join(' '))
  return parts.join('\n\n')
}
function methodsDraft(f: FrameData, scales: SavedScale[], project: Project): string {
  const c = (project.stages.collect?.data || {}) as { targetN?: string; mode?: string }
  const parts: string[] = []
  if (f.design) parts.push(`Design. A ${f.design.toLowerCase()} design was used.`)
  const ppts = [c.targetN ? `A sample of N = ${c.targetN}` : '', c.mode ? `was recruited via ${c.mode.toLowerCase()}` : ''].filter(Boolean).join(' ')
  if (ppts) parts.push(`Participants. ${ppts}.`)
  if (scales.length)
    parts.push(
      'Measures. ' +
        scales
          .map((s) => `${s.construct || s.name} was measured with the ${s.name}${s.abbreviation ? ` (${s.abbreviation})` : ''}, ${s.itemCount} items${s.alphaSummary ? `, α = ${s.alphaSummary}` : ''} (${s.citation}).`)
          .join(' '),
    )
  return parts.join('\n\n')
}
function referencesDraft(f: FrameData, scales: SavedScale[], papers: ReturnType<typeof readingList>): string {
  const refs: string[] = []
  if (f.theory?.citation) refs.push(f.theory.citation)
  scales.forEach((s) => s.citation && refs.push(s.citation))
  papers.forEach((p) => refs.push(`${(p.authors || []).join(', ')} (${p.year ?? 'n.d.'}). ${p.title}.${p.doi ? ` https://doi.org/${p.doi}` : ''}`))
  return [...new Set(refs)].join('\n')
}

// ── bits ─────────────────────────────────────────────────────────────────────
function Section({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bld-section">
      <div className="bld-section-head">
        <h2 className="bld-h" style={{ margin: 0 }}>{label}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
function PullBtn({ onClick, disabled, label = 'Pull from project' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button className="btn btn-ghost btn-sm" onClick={onClick} disabled={disabled} title={disabled ? 'Nothing to pull yet' : ''}>
      <Icon name="arrow" size={13} /> {label}
    </button>
  )
}
