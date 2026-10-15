import { useEffect, useMemo, useRef, useState } from 'react'
import { FLOW, flowTitle, nextAction, reviewed } from '../lib/studyFlow'
import { navigate } from '../lib/router'
import type { Project, StageId } from '../lib/types'

/* StudyTrail — the seven checkpoints as one river, with every saved study afloat at
 * the checkpoint it is actually waiting on (home visual; replaces the static 4-step list).
 *
 * No-fab: stations are the real FLOW stages (titles via flowTitle where a study is
 * shown, else the canonical names). A study's position = nextAction() — the first
 * checkpoint the AUTHOR has not reviewed — and its reviewed count is reviewed() over
 * FLOW. Nothing is inferred about quality. Studies with every checkpoint reviewed sit
 * at the estuary. Station hues reuse Studio's A→Z stage ramp.
 *
 * Motion: water drifts downstream; lanterns bob gently. Still under reduced motion
 * unless the viewer opts in ("Let it flow", per device).
 */

const NAMES: Record<StageId, string> = { discover: 'Discover', frame: 'Frame', measure: 'Measure', collect: 'Collect', analyze: 'Analyze', write: 'Write', publish: 'Publish' } as Record<StageId, string>
const HUES = ['#FF9656', '#FA7E5F', '#F66569', '#F24C72', '#D85096', '#B560C5', '#9270F4']
const FLOW_KEY = 'syed_flow'
const MAX_SHOWN = 24

type Boat = { p: Project; at: number; reviewedN: number; x: number; y: number }

export function StudyTrail({ projects, preparedCount, onPrepared }: { projects: Project[]; preparedCount: number; onPrepared: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(1000)
  const [hover, setHover] = useState<{ kind: 'stage'; i: number } | { kind: 'boat'; b: Boat } | { kind: 'spring' } | null>(null)
  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), [])
  const [flow, setFlow] = useState(() => { try { return !reduce.matches || localStorage.getItem(FLOW_KEY) === '1' } catch { return !reduce.matches } })

  useEffect(() => {
    const el = host.current; if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(300, el.clientWidth)))
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-offscreen', !e.isIntersecting))
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])

  const mobile = W < 640
  const H = mobile ? 210 : 230
  // the river: an S-curve from the spring (left) to the estuary (right)
  const geo = useMemo(() => {
    // everything stays inside [0, W]: spring at the left edge, estuary at the right
    const spring = mobile ? 14 : 36, x0 = spring + (mobile ? 22 : 34), x1 = W - (mobile ? 24 : 70), mid = H / 2 - 6, amp = mobile ? 34 : 46
    const yAt = (x: number) => mid + Math.sin(((x - x0) / (x1 - x0)) * Math.PI * 2.2 - 0.6) * amp
    let d = ''
    const xEnd = W - (mobile ? 6 : 14)
    for (let x = spring; x <= xEnd; x += 6) d += `${d ? 'L' : 'M'}${x.toFixed(1)},${yAt(x).toFixed(1)}`
    const st = FLOW.map((_, i) => { const x = x0 + ((i + 0.5) / FLOW.length) * (x1 - x0); return { x, y: yAt(x) } })
    return { x0, x1, yAt, d, st, spring, estuary: { x: Math.min(xEnd - 4, x1 + (mobile ? 12 : 30)), y: yAt(Math.min(xEnd - 4, x1 + (mobile ? 12 : 30))) } }
  }, [W, H, mobile])

  const boats: Boat[] = useMemo(() => {
    const groups = new Map<number, Project[]>()
    for (const p of projects.slice(0, MAX_SHOWN)) {
      const n = nextAction(p), at = n ? FLOW.indexOf(n) : FLOW.length
      if (!groups.has(at)) groups.set(at, [])
      groups.get(at)!.push(p)
    }
    const out: Boat[] = []
    for (const [at, list] of groups) {
      const base = at < FLOW.length ? geo.st[at] : geo.estuary
      list.forEach((p, k) => {
        // fan out along the bank: alternate above/below the station, stepping outward
        // float on the side opposite the station's label (labels: even below, odd above), fanning out
        const side = at < FLOW.length ? (at % 2 ? 1 : -1) : -1, row = Math.floor(k / 3), colk = (k % 3) - 1
        out.push({ p, at, reviewedN: FLOW.filter((id) => reviewed(p, id)).length, x: base.x + colk * (mobile ? 9 : 13), y: base.y + side * (18 + row * (mobile ? 10 : 13)) })
      })
    }
    return out
  }, [projects, geo, mobile])

  const atStage = (i: number) => boats.filter((b) => b.at === i).length
  const done = boats.filter((b) => b.at === FLOW.length).length
  const shown = Math.min(projects.length, MAX_SHOWN)

  const read = (() => {
    if (hover?.kind === 'boat') {
      const b = hover.b, stage = b.at < FLOW.length ? flowTitle(b.p, FLOW[b.at]) : null
      return <><b>{b.p.title || 'Untitled study'}</b> <span>· {b.reviewedN} of 7 checkpoints reviewed by you{stage ? ` · next: ${stage}` : ' · every checkpoint reviewed'} — click to continue</span></>
    }
    if (hover?.kind === 'stage') {
      const n = atStage(hover.i)
      return <><b>{NAMES[FLOW[hover.i]]}</b> <span>· checkpoint {hover.i + 1} of 7 · {n ? `${n} of your studies ${n === 1 ? 'is' : 'are'} waiting here` : 'none of your studies is waiting here'}</span></>
    }
    if (hover?.kind === 'spring') return <><b>{preparedCount} prepared working papers</b> <span>· source-backed starting points at the spring — click to choose one</span></>
    if (!projects.length) return <><b>Your research, as one river</b> <span>· seven checkpoints from first source to submission. Start a study and it appears here at Discover; it moves on only when you review each checkpoint.</span></>
    return <><b>{shown === projects.length ? `All ${projects.length}` : `${shown} most recent of ${projects.length}`} {projects.length === 1 ? 'study' : 'studies'}, afloat where each is waiting</b> <span>· position = the first checkpoint you haven't reviewed{done ? ` · ${done} fully reviewed at the estuary` : ''}. Reviews are your own checks, not a verdict on the study.</span></>
  })()

  return (
    <section ref={host} className={`trail ${flow ? 'is-flowing' : ''}`} aria-label="Your studies along the seven checkpoints">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="trail-svg" role="img"
        aria-label={`Seven checkpoints, Discover to Publish. ${projects.length ? FLOW.map((id, i) => `${NAMES[id]}: ${atStage(i)}`).join(', ') + (done ? `, fully reviewed: ${done}` : '') : 'No saved studies yet.'}`}
        onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="trailWater" x1="0" x2="1" y1="0" y2="0">
            {HUES.map((h, i) => <stop key={h} offset={i / (HUES.length - 1)} stopColor={h} />)}
          </linearGradient>
        </defs>
        <path d={geo.d} className="trail-bank" />
        <path d={geo.d} stroke="url(#trailWater)" className="trail-river" />
        <path d={geo.d} className="trail-current" />
        <path d={geo.d} className="trail-current slow" />
        {/* spring: the prepared papers */}
        <g className="trail-spring" onPointerEnter={() => setHover({ kind: 'spring' })} onClick={onPrepared} role="button" tabIndex={0} aria-label={`${preparedCount} prepared working papers — choose one`}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPrepared() } }}>
          <circle cx={geo.spring} cy={geo.yAt(geo.spring)} r={mobile ? 8 : 12} />
          {!mobile && <text x={geo.spring} y={geo.yAt(geo.spring) + 28} textAnchor="middle">{preparedCount} prepared</text>}
        </g>
        {geo.st.map((s, i) => (
          <g key={FLOW[i]} className={`trail-stage ${hover?.kind === 'stage' && hover.i === i ? 'on' : ''}`} onPointerEnter={() => setHover({ kind: 'stage', i })}>
            <circle cx={s.x} cy={s.y} r={mobile ? 7 : 9} fill={HUES[i]} className="trail-stone" />
            <text x={s.x} y={s.y + (i % 2 ? -18 : 26)} textAnchor="middle" className="trail-name">{NAMES[FLOW[i]]}</text>
            {!mobile && <text x={s.x} y={s.y + (i % 2 ? -32 : 40)} textAnchor="middle" className="trail-num">0{i + 1}</text>}
          </g>
        ))}
        {boats.map((b, k) => (
          <g key={b.p.id} className={`trail-boat ${hover?.kind === 'boat' && hover.b.p.id === b.p.id ? 'on' : ''}`} style={{ ['--dl' as string]: `${-(k * 0.83) % 5}s` }}
            onPointerEnter={() => setHover({ kind: 'boat', b })} onClick={() => navigate(`/p/${b.p.id}/${b.at < FLOW.length ? FLOW[b.at] : 'publish'}`)}
            role="button" tabIndex={0} aria-label={`${b.p.title || 'Untitled study'}: ${b.reviewedN} of 7 reviewed`}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/p/${b.p.id}/${b.at < FLOW.length ? FLOW[b.at] : 'publish'}`) }}>
            <circle cx={b.x} cy={b.y} r={mobile ? 4.5 : 5.5} fill={b.at < FLOW.length ? HUES[b.at] : '#9270F4'} />
            <circle cx={b.x} cy={b.y} r={mobile ? 8 : 10} className="trail-glow" fill={b.at < FLOW.length ? HUES[b.at] : '#9270F4'} />
          </g>
        ))}
        <text x={geo.estuary.x} y={geo.estuary.y + (mobile ? 22 : 26)} textAnchor="end" className="trail-num">{mobile ? 'done' : 'reviewed'}</text>
      </svg>
      <div className="trail-foot">
        <p className="trail-read" aria-live="polite">{read}</p>
        {reduce.matches && (
          <button type="button" className="trail-flow" aria-pressed={flow}
            onClick={() => { const v = !flow; setFlow(v); try { localStorage.setItem(FLOW_KEY, v ? '1' : '0') } catch { /* per-device */ } }}>
            {flow ? '❚❚ Hold still' : '▶ Let it flow'}
          </button>
        )}
      </div>
    </section>
  )
}
