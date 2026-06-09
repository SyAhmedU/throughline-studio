// ============================================================================
// Throughline Studio — Analyze stage workspace.
// A real, in-browser statistics workbench over the ToolsScope engine (ported
// verbatim, textbook-verified). Load data (paste / upload / simulated demo),
// run the social-science staples (descriptives, correlations, reliability,
// t-test, ANOVA), read the APA write-up, and capture results that carry
// forward. Deep-links to ToolsScope for the deeper engine (regression,
// mediation, EFA/CFA).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  categoricalVars,
  colsByName,
  column,
  groupValues,
  levelsOf,
  makeDemo,
  numericVars,
  parseDelimited,
  type Dataset,
} from '../lib/dataset'
import { deepLink, stageDef } from '../lib/stages'
import {
  correlationMatrix,
  cronbach,
  describe,
  independentTTest,
  oneWayAnova,
} from '../lib/stats'
import { setStageData } from '../lib/store'
import type { Project } from '../lib/types'

type Analysis = 'descriptives' | 'correlations' | 'reliability' | 'ttest' | 'anova'
const ANALYSES: { key: Analysis; label: string }[] = [
  { key: 'descriptives', label: 'Descriptives' },
  { key: 'correlations', label: 'Correlations' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'ttest', label: 't-test' },
  { key: 'anova', label: 'ANOVA' },
]

interface Capture {
  id: string
  title: string
  apa: string
  at: number
}

interface Selections {
  corr: string[]
  rel: string[]
  ttDV: string
  ttG: string
  anDV: string
  anF: string
}

// ── number formatting (APA-ish) ────────────────────────────────────────────
const f2 = (x: number, d = 2): string => (Number.isFinite(x) ? x.toFixed(d) : '—')
const noLead = (s: string): string => s.replace(/^(-?)0(?=\.)/, '$1')
const rfmt = (r: number): string => (Number.isFinite(r) ? noLead(r.toFixed(2)) : '—')
const pfmt = (p: number): string =>
  !Number.isFinite(p) ? '—' : p < 0.001 ? '< .001' : '= ' + noLead(p.toFixed(3))
const stars = (p: number): string => (p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '')

function getCaptures(p: Project): Capture[] {
  const d = p.stages.analyze?.data as { captures?: Capture[] } | undefined
  return Array.isArray(d?.captures) ? d!.captures! : []
}

export function AnalyzeBody({
  project,
  onChange,
  topic,
}: {
  project: Project
  onChange: (p: Project) => void
  topic: string
}) {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis>('descriptives')
  const [sel, setSel] = useState<Selections>({ corr: [], rel: [], ttDV: '', ttG: '', anDV: '', anF: '' })

  // default selections when a dataset loads
  useEffect(() => {
    if (!ds) return
    const nums = numericVars(ds)
    const cats = categoricalVars(ds)
    setSel({
      corr: nums.slice(0, 8),
      rel: nums.slice(0, 6),
      ttDV: nums[0] ?? '',
      ttG: cats[0] ?? '',
      anDV: nums[0] ?? '',
      anF: cats[0] ?? '',
    })
  }, [ds])

  function loadPaste() {
    const res = parseDelimited(paste, 'Pasted data')
    if ('error' in res) {
      setError(res.error)
      return
    }
    setError(null)
    setDs(res)
  }
  async function loadFile(file: File) {
    const text = await file.text()
    const res = parseDelimited(text, file.name)
    if ('error' in res) {
      setError(res.error)
      return
    }
    setError(null)
    setDs(res)
  }

  const captures = getCaptures(project)
  function capture(title: string, apa: string) {
    const next: Capture[] = [{ id: 'r' + Date.now().toString(36), title, apa, at: Date.now() }, ...captures]
    onChange(
      setStageData(project, 'analyze', {
        ...(project.stages.analyze.data || {}),
        captures: next,
        datasetName: ds?.name,
      }),
    )
  }
  function removeCapture(id: string) {
    onChange(
      setStageData(project, 'analyze', {
        ...(project.stages.analyze.data || {}),
        captures: captures.filter((c) => c.id !== id),
      }),
    )
  }

  // ── no dataset yet → loader ────────────────────────────────────────────────
  if (!ds) {
    return (
      <div className="anz">
        <h2 className="stage-h2">Bring in your data</h2>
        <p className="stage-note-line">
          Paste a table, upload a CSV/TSV, or load a simulated demo. Everything runs in your browser —
          nothing is uploaded.
        </p>
        <textarea
          className="anz-paste"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={'Paste CSV or TSV (first row = column names)\n\ngroup,age,score\nA,34,5.2\nB,29,4.1'}
          rows={7}
        />
        {error && <p className="anz-error">{error}</p>}
        <div className="anz-load-actions">
          <button className="btn btn-fill" disabled={!paste.trim()} onClick={loadPaste}>
            <Icon name="analyze" size={15} /> Load pasted data
          </button>
          <label className="btn btn-ghost anz-upload">
            <Icon name="collect" size={15} /> Upload CSV/TSV
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              hidden
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            />
          </label>
          <button className="btn btn-ghost" onClick={() => setDs(makeDemo())}>
            Load simulated demo
          </button>
        </div>
        <FullTools topic={topic} />
      </div>
    )
  }

  const nums = numericVars(ds)
  const cats = categoricalVars(ds)

  return (
    <div className="anz">
      {/* dataset summary */}
      <div className="anz-ds">
        <div className="anz-ds-top">
          <span className="anz-ds-name">
            {ds.name} {ds.simulated && <span className="anz-sim">simulated</span>}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDs(null)
              setError(null)
            }}
          >
            Change data
          </button>
        </div>
        <p className="anz-ds-meta">
          {ds.rows.length.toLocaleString()} rows · {ds.variables.length} variables
        </p>
        <div className="anz-var-chips">
          {ds.variables.map((v) => (
            <span key={v.name} className={`anz-var anz-var-${v.type}`}>
              {v.name}
            </span>
          ))}
        </div>
      </div>

      {/* analysis picker */}
      <div className="anz-tabs" role="tablist">
        {ANALYSES.map((a) => (
          <button
            key={a.key}
            role="tab"
            aria-selected={analysis === a.key}
            className={`anz-tab ${analysis === a.key ? 'is-on' : ''}`}
            onClick={() => setAnalysis(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="anz-panel">
        {analysis === 'descriptives' && <Descriptives ds={ds} onCapture={capture} />}
        {analysis === 'correlations' && (
          <Correlations ds={ds} nums={nums} cats={cats} sel={sel} setSel={setSel} onCapture={capture} />
        )}
        {analysis === 'reliability' && (
          <Reliability ds={ds} nums={nums} cats={cats} sel={sel} setSel={setSel} onCapture={capture} />
        )}
        {analysis === 'ttest' && (
          <TTest ds={ds} nums={nums} cats={cats} sel={sel} setSel={setSel} onCapture={capture} />
        )}
        {analysis === 'anova' && (
          <Anova ds={ds} nums={nums} cats={cats} sel={sel} setSel={setSel} onCapture={capture} />
        )}
      </div>

      {/* captured results — the carry-forward */}
      {captures.length > 0 && (
        <div className="anz-captures">
          <h3 className="anz-cap-h">Captured for the write-up ({captures.length})</h3>
          <ul className="anz-cap-list">
            {captures.map((c) => (
              <li key={c.id}>
                <div>
                  <span className="anz-cap-title">{c.title}</span>
                  <p className="anz-cap-apa">{c.apa}</p>
                </div>
                <button className="icon-btn" aria-label="Remove" onClick={() => removeCapture(c.id)}>
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FullTools topic={topic} compact />
    </div>
  )
}

// ── analysis sub-panels ─────────────────────────────────────────────────────

function ApaLine({ text, onCapture, title }: { text: string; onCapture: (t: string, a: string) => void; title: string }) {
  return (
    <div className="anz-apa">
      <p className="anz-apa-text">{text}</p>
      <button className="btn btn-fill btn-sm" onClick={() => onCapture(title, text)}>
        <Icon name="plus" size={13} /> Capture
      </button>
    </div>
  )
}

function Descriptives({ ds, onCapture }: { ds: Dataset; onCapture: (t: string, a: string) => void }) {
  const rows = useMemo(() => numericVars(ds).map((v) => describe(v, column(ds, v))), [ds])
  if (rows.length === 0) return <Empty msg="No numeric variables to describe." />
  const apa = `Descriptive statistics were computed for ${rows.length} numeric variable${rows.length === 1 ? '' : 's'} (N = ${ds.rows.length}).`
  return (
    <>
      <div className="anz-tablewrap">
        <table className="anz-table">
          <thead>
            <tr>
              <th>Variable</th><th>N</th><th>M</th><th>SD</th><th>Min</th><th>Max</th><th>Skew</th><th>Kurt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variable}>
                <td className="anz-td-l">{r.variable}</td>
                <td>{r.n}</td><td>{f2(r.mean)}</td><td>{f2(r.sd)}</td>
                <td>{f2(r.min)}</td><td>{f2(r.max)}</td>
                <td>{f2(r.skewness)}</td><td>{f2(r.kurtosis)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ApaLine text={apa} title="Descriptive statistics" onCapture={onCapture} />
    </>
  )
}

function Correlations({
  ds, nums, sel, setSel, onCapture,
}: SubProps) {
  const vars = sel.corr.filter((v) => nums.includes(v))
  const cm = useMemo(() => (vars.length >= 2 ? correlationMatrix(colsByName(ds), vars, 'pearson') : null), [ds, vars])
  return (
    <>
      <VarPicker label="Variables (numeric)" all={nums} picked={sel.corr} onToggle={(v) => setSel((s) => ({ ...s, corr: toggle(s.corr, v) }))} />
      {!cm ? (
        <Empty msg="Pick at least two numeric variables." />
      ) : (
        <>
          <div className="anz-tablewrap">
            <table className="anz-table anz-corr">
              <thead>
                <tr>
                  <th></th>
                  {cm.vars.map((v, j) => <th key={v}>{j + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {cm.vars.map((v, i) => (
                  <tr key={v}>
                    <td className="anz-td-l">{i + 1}. {v}</td>
                    {cm.vars.map((_, j) => (
                      <td key={j}>
                        {j > i ? '' : i === j ? '—' : `${rfmt(cm.r[i][j])}${stars(cm.p[i][j])}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="anz-fineprint">Pearson r. * p&lt;.05, ** p&lt;.01, *** p&lt;.001. Pairwise N.</p>
          <ApaLine
            text={`A Pearson correlation matrix was computed among ${cm.vars.length} variables (pairwise N up to ${ds.rows.length}).`}
            title="Correlation matrix"
            onCapture={onCapture}
          />
        </>
      )}
    </>
  )
}

function Reliability({ ds, nums, sel, setSel, onCapture }: SubProps) {
  const items = sel.rel.filter((v) => nums.includes(v))
  const rel = useMemo(() => (items.length >= 2 ? cronbach(colsByName(ds), items) : null), [ds, items])
  return (
    <>
      <VarPicker label="Scale items (numeric)" all={nums} picked={sel.rel} onToggle={(v) => setSel((s) => ({ ...s, rel: toggle(s.rel, v) }))} />
      {!rel ? (
        <Empty msg="Pick at least two items that form a scale." />
      ) : (
        <>
          <div className="anz-stat-row">
            <Stat label="Cronbach's α" value={f2(rel.alpha)} />
            <Stat label="McDonald's ω*" value={rel.omega !== undefined ? f2(rel.omega) : '—'} />
            <Stat label="Items" value={String(rel.k)} />
            <Stat label="N (complete)" value={String(rel.n)} />
          </div>
          {rel.reversedSuggestions.length > 0 && (
            <p className="anz-warn">⚠ Possible reverse-keyed item(s): {rel.reversedSuggestions.join(', ')} (negative item-total r).</p>
          )}
          <div className="anz-tablewrap">
            <table className="anz-table">
              <thead><tr><th>Item</th><th>Corrected item-total r</th><th>α if deleted</th></tr></thead>
              <tbody>
                {rel.itemTotal.map((it) => (
                  <tr key={it.item}>
                    <td className="anz-td-l">{it.item}</td>
                    <td>{rfmt(it.corrected_r)}</td>
                    <td>{f2(it.alpha_if_deleted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="anz-fineprint">* ω is a single-factor approximation — run a factor model in ToolsScope for a full estimate.</p>
          <ApaLine
            text={`Internal consistency was acceptable, Cronbach's α = ${rfmt(rel.alpha)} for the ${rel.k}-item scale (N = ${rel.n}).`}
            title="Reliability (Cronbach's α)"
            onCapture={onCapture}
          />
        </>
      )}
    </>
  )
}

function TTest({ ds, nums, cats, sel, setSel, onCapture }: SubProps) {
  const levels = sel.ttG ? levelsOf(ds, sel.ttG) : []
  const ready = sel.ttDV && sel.ttG && levels.length === 2
  const res = useMemo(() => {
    if (!ready) return null
    const gv = groupValues(ds, sel.ttDV, sel.ttG)
    if (gv.length !== 2) return null
    return { gv, t: independentTTest(gv[0].values, gv[1].values, true) }
  }, [ds, sel.ttDV, sel.ttG, ready])
  return (
    <>
      <div className="anz-selectors">
        <Field label="Outcome (numeric)"><Select value={sel.ttDV} opts={nums} onChange={(v) => setSel((s) => ({ ...s, ttDV: v }))} /></Field>
        <Field label="Group (2 levels)"><Select value={sel.ttG} opts={cats} onChange={(v) => setSel((s) => ({ ...s, ttG: v }))} /></Field>
      </div>
      {sel.ttG && levels.length !== 2 && (
        <Empty msg={`“${sel.ttG}” has ${levels.length} level(s). An independent t-test needs exactly 2 — use ANOVA for more.`} />
      )}
      {res && (
        <>
          <div className="anz-stat-row">
            <Stat label={`${res.gv[0].level} (M, SD)`} value={`${f2(res.t.m1)}, ${f2(res.t.sd1)}`} />
            <Stat label={`${res.gv[1].level} (M, SD)`} value={`${f2(res.t.m2)}, ${f2(res.t.sd2)}`} />
            <Stat label="t" value={f2(res.t.t)} />
            <Stat label="df" value={f2(res.t.df, 1)} />
            <Stat label="p" value={pfmt(res.t.p)} />
            <Stat label="Cohen's d" value={f2(res.t.cohensD)} />
          </div>
          <ApaLine
            text={`A Welch independent-samples t-test compared ${sel.ttDV} between ${res.gv[0].level} (M = ${f2(res.t.m1)}, SD = ${f2(res.t.sd1)}) and ${res.gv[1].level} (M = ${f2(res.t.m2)}, SD = ${f2(res.t.sd2)}), t(${f2(res.t.df, 1)}) = ${f2(res.t.t)}, p ${pfmt(res.t.p)}, d = ${f2(res.t.cohensD)}.`}
            title="Independent t-test"
            onCapture={onCapture}
          />
        </>
      )}
    </>
  )
}

function Anova({ ds, nums, cats, sel, setSel, onCapture }: SubProps) {
  const res = useMemo(() => {
    if (!sel.anDV || !sel.anF) return null
    const gv = groupValues(ds, sel.anDV, sel.anF)
    if (gv.length < 2) return null
    return oneWayAnova(sel.anDV, sel.anF, gv)
  }, [ds, sel.anDV, sel.anF])
  return (
    <>
      <div className="anz-selectors">
        <Field label="Outcome (numeric)"><Select value={sel.anDV} opts={nums} onChange={(v) => setSel((s) => ({ ...s, anDV: v }))} /></Field>
        <Field label="Factor (2+ levels)"><Select value={sel.anF} opts={cats} onChange={(v) => setSel((s) => ({ ...s, anF: v }))} /></Field>
      </div>
      {!res ? (
        <Empty msg="Pick a numeric outcome and a grouping factor with at least two levels." />
      ) : (
        <>
          <div className="anz-stat-row">
            <Stat label="F" value={f2(res.fStat)} />
            <Stat label="df" value={`${res.dfBetween}, ${res.dfWithin}`} />
            <Stat label="p" value={pfmt(res.p)} />
            <Stat label="η²" value={f2(res.etaSquared)} />
          </div>
          <div className="anz-tablewrap">
            <table className="anz-table">
              <thead><tr><th>{sel.anF}</th><th>N</th><th>M</th><th>SD</th></tr></thead>
              <tbody>
                {res.groups.map((g) => (
                  <tr key={g.level}>
                    <td className="anz-td-l">{g.level}</td><td>{g.n}</td><td>{f2(g.mean)}</td><td>{f2(g.sd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {res.postHoc && res.postHoc.length > 0 && (
            <p className="anz-fineprint">
              Post-hoc (Bonferroni): {res.postHoc.map((h) => `${h.a}–${h.b} p ${pfmt(h.p)}`).join('; ')}
            </p>
          )}
          <ApaLine
            text={`A one-way ANOVA tested the effect of ${sel.anF} on ${sel.anDV}; F(${res.dfBetween}, ${res.dfWithin}) = ${f2(res.fStat)}, p ${pfmt(res.p)}, η² = ${f2(res.etaSquared)}.`}
            title="One-way ANOVA"
            onCapture={onCapture}
          />
        </>
      )}
    </>
  )
}

// ── small shared bits ───────────────────────────────────────────────────────

interface SubProps {
  ds: Dataset
  nums: string[]
  cats: string[]
  sel: Selections
  setSel: React.Dispatch<React.SetStateAction<Selections>>
  onCapture: (t: string, a: string) => void
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function VarPicker({
  label, all, picked, onToggle,
}: {
  label: string
  all: string[]
  picked: string[]
  onToggle: (v: string) => void
}) {
  if (all.length === 0) return <Empty msg="No numeric variables in this dataset." />
  return (
    <div className="anz-picker">
      <span className="anz-picker-label">{label}</span>
      <div className="anz-picker-chips">
        {all.map((v) => (
          <button
            key={v}
            className={`anz-pick ${picked.includes(v) ? 'is-on' : ''}`}
            onClick={() => onToggle(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="anz-field">
      <span className="anz-field-label">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, opts, onChange }: { value: string; opts: string[]; onChange: (v: string) => void }) {
  return (
    <select className="disc-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.length === 0 && <option value="">—</option>}
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="anz-stat">
      <span className="anz-stat-v">{value}</span>
      <span className="anz-stat-l">{label}</span>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <p className="anz-empty">{msg}</p>
}

function FullTools({ topic, compact }: { topic: string; compact?: boolean }) {
  const t = stageDef('analyze').tools[0]
  return (
    <div className={compact ? 'disc-fulltools' : 'anz-fulltools'}>
      <span className="disc-fulltools-label">
        Need regression, mediation, EFA/CFA, or the figures? Open the full engine ↗
      </span>
      <div className="disc-fulltools-row">
        <a className="disc-fulltool" href={deepLink(t, topic)} target="_blank" rel="noopener noreferrer">
          {t.name} <Icon name="external" size={12} />
        </a>
      </div>
    </div>
  )
}
