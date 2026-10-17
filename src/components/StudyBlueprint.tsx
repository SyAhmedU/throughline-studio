import { useEffect, useMemo, useState } from 'react'
import { loadGraph, searchConstructs, corpusLink, theoryLink, type GraphConstruct } from '../lib/graph'
import { loadScales, scaleLink, type Scale } from '../lib/scales'
import { loadTheories, type Theory } from '../lib/theories'
import { nForCorr } from '../lib/power'

/*
 * Study blueprint — the home's answer to "what would my study look like?".
 * Type a topic or a question; the constructs it names are found in the Research Book's
 * 167 hand-coded constructs (phrase match on names + synonyms, no AI), and each of the
 * seven stages shows the real material Studio would hand you there: the Book's most-cited
 * coded papers (DOI-linked), the TheoryScope theories and ScaleScope scales its crosswalk
 * links to the construct (machine-matched, badged verify), a power-based N, the analysis
 * the shape implies, and what Write/Publish assemble. "Start this study" creates the
 * project exactly like the hub's ?topic= hand-off (title + question only); nothing is filled
 * in or marked reviewed on the author's behalf.
 */

const BOOK = 'https://syahmedu.github.io/syeds-research-book'
const HUES = ['#FF9656', '#FA7E5F', '#F66569', '#F24C72', '#D85096', '#B560C5', '#9270F4']
const TRY = ['burnout', 'servant leadership and turnover intention', 'psychological safety and creativity', 'work engagement']
const R_PLAN = 0.2

interface TopPaper { t: string; a?: string; y?: number; doi?: string; j?: string; c?: number }
interface SnapC { code: string; top?: TopPaper[] }
interface Data { graph: GraphConstruct[]; top: Map<string, TopPaper[]>; scales: Map<number, Scale>; theories: Map<string, Theory> }

let pending: Promise<Data> | null = null
function load(): Promise<Data> {
  if (!pending) pending = Promise.all([
    loadGraph(),
    fetch(`${BOOK}/data/corpus-snapshot.json`).then(r => (r.ok ? r.text() : '{}')).then(t => JSON.parse(t.replace(/^﻿/, '')) as { constructs?: SnapC[] }).catch(() => ({ constructs: [] as SnapC[] })),
    loadScales().catch(() => [] as Scale[]),
    loadTheories().catch(() => [] as Theory[]),
  ]).then(([graph, snap, scales, theories]) => ({
    graph,
    top: new Map((snap.constructs || []).map(c => [c.code, c.top || []])),
    scales: new Map(scales.map(s => [s.id, s])),
    theories: new Map(theories.map(t => [t.slug, t])),
  })).catch(e => { pending = null; throw e })
  return pending
}

const norm = (s: string) => ` ${s.toLowerCase().replace(/[‐-―-]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `

/** Constructs the text names, in reading order: longest phrase first, no overlaps; else the best single match. */
function resolve(all: GraphConstruct[], q: string): GraphConstruct[] {
  const text = norm(q)
  if (text.trim().length < 3) return []
  const hits: { c: GraphConstruct; at: number; len: number }[] = []
  for (const c of all) {
    let best: { at: number; len: number } | null = null
    for (const label of [c.name, ...c.identifiers]) {
      const n = norm(label)
      if (n.trim().length < 4) continue
      for (const form of [n, n.replace(/s $/, ' ')]) {
        const at = text.indexOf(form)
        if (at >= 0 && (!best || form.length > best.len)) best = { at, len: form.length }
      }
    }
    if (best) hits.push({ c, ...best })
  }
  hits.sort((a, b) => b.len - a.len || b.c.paperCount - a.c.paperCount)
  const kept: typeof hits = []
  for (const h of hits) if (!kept.some(k => h.at < k.at + k.len - 1 && k.at < h.at + h.len - 1) && !kept.some(k => k.c.code === h.c.code)) kept.push(h)
  if (kept.length) return kept.sort((a, b) => a.at - b.at).slice(0, 3).map(h => h.c)
  return searchConstructs(all, q.trim(), 1)
}

const alphaOf = (s: Scale) => {
  const as = (s.dimensions || []).map(d => d.alpha).filter((a): a is number => typeof a === 'number')
  if (!as.length) return s.reliability?.cronbach_alpha ? `α ${s.reliability.cronbach_alpha}` : ''
  const lo = Math.min(...as), hi = Math.max(...as)
  return `α ${lo.toFixed(2)}${hi > lo ? `–${hi.toFixed(2)}` : ''}`
}
const shortAuth = (a?: string) => (a || '').replace(/ et al\.?$/, '').split(/,| and /)[0].trim().split(' ').pop() + ((a || '').includes('et al') || (a || '').includes(',') ? ' et al.' : '')

export function StudyBlueprint({ onStart }: { onStart: (title: string, question: string) => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState(TRY[1])
  useEffect(() => { let live = true; load().then(d => live && setData(d)).catch(() => live && setFailed(true)); return () => { live = false } }, [])

  const bp = useMemo(() => {
    if (!data) return null
    const cs = resolve(data.graph, q)
    if (!cs.length) return { ok: false as const, cs }
    const papers = cs.flatMap(c => (data.top.get(c.code) || []).slice(0, cs.length > 1 ? 1 : 2).map(p => ({ ...p, on: c.name })))
    const seenT = new Set<string>()
    const theories = cs.flatMap(c => c.theories).filter(t => !seenT.has(t.s) && seenT.add(t.s)).slice(0, 3).map(t => ({ ...t, full: data.theories.get(t.s) }))
    const scales = cs.flatMap(c => c.scales.slice(0, cs.length > 1 ? 1 : 3).map(s => ({ g: s, c: c.name, full: s.id != null ? data.scales.get(s.id) : undefined }))).slice(0, 3)
    const items = scales.reduce((k, s) => k + (s.full?.itemCount || 0), 0)
    const n = nForCorr(R_PLAN)
    const analysis = cs.length >= 3
      ? { what: 'Mediation (PROCESS Model 4) with bootstrapped indirect effect', why: `${cs[0].name} → ${cs[1].name} → ${cs[2].name}` }
      : cs.length === 2
        ? { what: 'Correlation + regression, with reliability (α) for each scale', why: `${cs[0].name} → ${cs[1].name}` }
        : { what: 'Descriptives + reliability (α), then relate it to one outcome you choose', why: cs[0].name }
    return { ok: true as const, cs, papers, theories, scales, items, n, analysis }
  }, [data, q])

  if (failed) return null
  const title = q.trim().replace(/^./, ch => ch.toUpperCase())
  const minutes = bp?.ok && bp.items ? Math.max(1, Math.round(bp.items * 6 / 60)) : 0

  return (
    <section className="bp" aria-labelledby="bp-title">
      <div className="bp-head">
        <p className="rh-eyebrow">Study blueprint</p>
        <h2 id="bp-title">See your study before you start it.</h2>
        <form className="bp-ask" onSubmit={e => e.preventDefault()}>
          <label htmlFor="bp-q">Your topic or question</label>
          <input id="bp-q" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. servant leadership and turnover intention" spellCheck={false} autoComplete="off" />
        </form>
        <div className="bp-try">{TRY.map(t => <button key={t} type="button" aria-pressed={q === t} onClick={() => setQ(t)}>{t}</button>)}</div>
      </div>

      {!bp ? <p className="bp-wait" role="status">Reading the Research Book, TheoryScope and ScaleScope…</p>
        : !bp.ok ? <p className="bp-wait">None of the Research Book’s {data?.graph.length} coded constructs is named in “{q}”. Try a construct such as burnout, engagement or leadership. A new name can still be a new study: start it and frame it yourself.</p>
        : <>
          <p className="bp-found">Constructs found: {bp.cs.map((c, i) => <b key={c.code} style={{ ['--c' as string]: HUES[i * 3] }}>{c.name}</b>)}</p>
          <ol className="bp-line">
            <li style={{ ['--c' as string]: HUES[0] }}><span className="bp-k">01 Discover</span>
              <strong>{bp.cs.map(c => c.paperCount.toLocaleString()).join(' · ')}<small> coded papers on {bp.cs.map(c => c.name).join(' · ')}</small></strong>
              <ul>{bp.papers.map(p => <li key={(p.doi || p.t) + p.on}><a href={p.doi ? `https://doi.org/${p.doi}` : corpusLink(bp.cs[0].code)} target="_blank" rel="noreferrer">{p.t}</a><small>{shortAuth(p.a)} {p.y || ''}{p.j ? ` · ${p.j}` : ''}{p.c ? ` · cited ${p.c.toLocaleString()}` : ''}</small></li>)}</ul>
              <a className="bp-more" href={corpusLink(bp.cs[0].code)} target="_blank" rel="noreferrer">All in the Research Book ↗</a></li>
            <li style={{ ['--c' as string]: HUES[1] }}><span className="bp-k">02 Frame</span>
              <strong>{bp.theories.length ? `${bp.theories.length} theor${bp.theories.length > 1 ? 'ies' : 'y'}` : 'Your lens'}<small>{bp.theories.length ? ' linked to these constructs' : ' (no theory linked yet)'}</small></strong>
              <ul>{bp.theories.map(t => <li key={t.s}><a href={theoryLink(t.s)} target="_blank" rel="noreferrer">{t.full?.acronym ? <b>{t.full.acronym} </b> : null}{t.n}</a><small>{t.full?.originators ? `${t.full.originators}${t.full.year ? `, ${t.full.year}` : ''}` : t.full?.year || ''}</small></li>)}</ul>
              <span className="bp-verify">machine-matched · verify</span></li>
            <li style={{ ['--c' as string]: HUES[2] }}><span className="bp-k">03 Measure</span>
              <strong>{bp.scales.length ? `${bp.items || '—'}` : '—'}<small>{bp.scales.length ? ` items across ${bp.scales.length} validated scale${bp.scales.length > 1 ? 's' : ''}` : ' no scale linked yet'}</small></strong>
              <ul>{bp.scales.map(s => <li key={`${s.g.id}-${s.c}`}><a href={s.g.id != null ? scaleLink(s.g.id) : '#'} target="_blank" rel="noreferrer">{s.g.ab ? <b>{s.g.ab} </b> : null}{s.g.n}</a><small>{s.full?.itemCount ? `${s.full.itemCount} items` : ''}{s.full ? ` · ${alphaOf(s.full)}` : ''}{bp.cs.length > 1 ? ` · ${s.c}` : ''}</small></li>)}</ul>
              <span className="bp-verify">machine-matched · verify</span></li>
            <li style={{ ['--c' as string]: HUES[3] }}><span className="bp-k">04 Collect</span>
              <strong>N = {bp.n}<small> to detect r = .20</small></strong>
              <p>Two-sided α = .05, power .80 (Fisher z). {minutes ? <>About <b>{minutes} min</b> per participant for {bp.items} items at ~6 s each.</> : null} You set the real effect size and lock the pre-registration here, before fielding.</p></li>
            <li style={{ ['--c' as string]: HUES[4] }}><span className="bp-k">05 Analyze</span>
              <strong className="bp-sm">{bp.analysis.what}</strong>
              <p>{bp.analysis.why}. Runs in the browser on your data; results only from what you capture.</p></li>
            <li style={{ ['--c' as string]: HUES[5] }}><span className="bp-k">06 Write</span>
              <strong className="bp-sm">IMRaD draft assembled from stages 1–5</strong>
              <p>Methods take your scales and target N in planned-method wording. Results stay empty until analyses are captured.</p></li>
            <li style={{ ['--c' as string]: HUES[6] }}><span className="bp-k">07 Publish</span>
              <strong className="bp-sm">Frozen pre-registration + open-science checklist</strong>
              <p>Data/materials links, reviewer-response record and a hashed study package. Nothing is submitted for you.</p></li>
          </ol>
          <div className="bp-go">
            <button className="btn btn-fill" type="button" onClick={() => onStart(title.slice(0, 80), q.trim())}>Start this study →</button>
            <span>Creates a study titled “{title.slice(0, 80)}” with your question. Every stage above is yours to change; nothing is pre-reviewed.</span>
          </div>
        </>}
      <p className="bp-rule"><b>Rule:</b> constructs = the Research Book’s hand-coded constructs whose name or synonym appears in your words (longest phrase first). Papers = the Book’s most-cited papers coded to each, with DOIs. Theories and scales = the Book’s construct crosswalk to TheoryScope and ScaleScope (label match, verify). N = the closed-form sample size for r = .20; α = the source’s reported reliability. No AI is used on this page.</p>
    </section>
  )
}
