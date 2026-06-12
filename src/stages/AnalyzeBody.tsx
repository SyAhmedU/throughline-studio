// ============================================================================
// Throughline Studio — Analyze stage workspace.
// A real, in-browser statistics workbench over the ToolsScope engine (ported
// verbatim, textbook-verified). Load data (paste / upload / simulated demo),
// run the social-science staples (descriptives, correlations, reliability,
// t-test, ANOVA), read the APA write-up, and capture results that carry
// forward. The dataset itself persists on the project (CSV, 200 KB cap) and
// restores on return. Deep-links to ToolsScope for the deeper engine
// (regression, mediation, EFA/CFA).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { ReadingFacets } from '../components/ReadingFacets'
import {
  categoricalVars,
  colsByName,
  column,
  groupValues,
  levelsOf,
  makeDemo,
  numericVars,
  parseDelimited,
  toDelimited,
  type Dataset,
} from '../lib/dataset'
import { deepLink, stageDef, toolLabel } from '../lib/stages'
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

/** Dataset persisted on the project (CSV round-trips through parseDelimited).
 *  Capped so a big upload can't blow localStorage / the cloud-sync row. */
interface SavedDataset {
  name: string
  csv: string
  simulated?: boolean
  savedAt: number
}
const DS_CAP = 200_000 // chars of CSV (~200 KB)

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

  const savedDs = (project.stages.analyze?.data as { dataset?: SavedDataset } | undefined)?.dataset

  // the design framed at the Frame stage conditions what these numbers can claim
  const frame = (project.stages.frame?.data || {}) as {
    design?: string
    iv?: string
    dv?: string
    mediators?: string
    moderators?: string
  }
  const crossSectional = frame.design === 'Correlational / survey'
  // every test in this embedded engine assumes independent rows — nested /
  // repeated observations violate that, and a qualitative design has no
  // business in a quant engine at all (audit findings B14/B18)
  const nestedDesign = /multilevel|nested|diary|experience sampling/i.test(frame.design || '')
  const qualDesign = frame.design === 'Qualitative'

  // ── Suggested analyses — deterministic, from the framed design (no AI) ────
  // Mirrors ToolsScope's recommender idea: read what was framed and point at
  // the right test. Embedded analyses are one click; mediation/moderation
  // deep-link to ToolsScope (the full engine lives there).
  const suggestions = useMemo(() => {
    const out: { label: string; why: string; run?: Analysis; external?: boolean }[] = []
    const experimental = frame.design === 'Experimental' || frame.design === 'Quasi-experimental'
    out.push({
      label: 'Reliability (α) first',
      why: 'compute α for every multi-item scale before building composites',
      run: 'reliability',
    })
    if (frame.iv?.trim() && frame.dv?.trim()) {
      if (experimental) {
        out.push({
          label: 't-test / ANOVA',
          why: `group difference on ${frame.dv.trim()} across ${frame.iv.trim()} conditions`,
          run: 'ttest',
        })
      } else {
        out.push({
          label: 'Correlations',
          why: `the ${frame.iv.trim()} → ${frame.dv.trim()} association (report as association${crossSectional ? ', not cause' : ''})`,
          run: 'correlations',
        })
      }
    }
    if (frame.mediators?.trim()) {
      out.push({
        label: 'Mediation — PROCESS Model 4',
        why: `indirect effect via ${frame.mediators.trim()} — run in ToolsScope (bootstrap CIs)`,
        external: true,
      })
    }
    if (frame.moderators?.trim()) {
      out.push({
        label: 'Moderation — PROCESS Model 1',
        why: `interaction with ${frame.moderators.trim()} — run in ToolsScope`,
        external: true,
      })
    }
    return out
  }, [frame.design, frame.iv, frame.dv, frame.mediators, frame.moderators, crossSectional])
  const framedAnything = !!(frame.design || frame.iv?.trim() || frame.dv?.trim())

  // restore the dataset persisted on the project (once, on mount)
  useEffect(() => {
    if (!savedDs?.csv) return
    const res = parseDelimited(savedDs.csv, savedDs.name)
    if (!('error' in res)) setDs({ ...res, simulated: savedDs.simulated })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Adopt a freshly loaded dataset: show it and persist it on the project
   *  (dropped silently when over the cap — the analyses still run). */
  function adopt(next: Dataset) {
    setError(null)
    setDs(next)
    const csv = toDelimited(next)
    const base = { ...(project.stages.analyze.data || {}), datasetName: next.name } as Record<string, unknown>
    if (csv.length <= DS_CAP) {
      base.dataset = {
        name: next.name,
        csv,
        ...(next.simulated ? { simulated: true } : {}),
        savedAt: Date.now(),
      } satisfies SavedDataset
    } else {
      delete base.dataset // a previous, smaller dataset shouldn't resurrect
    }
    onChange(setStageData(project, 'analyze', base))
  }

  function clearDataset() {
    setDs(null)
    setError(null)
    const base = { ...(project.stages.analyze.data || {}) } as Record<string, unknown>
    delete base.dataset
    delete base.datasetName
    onChange(setStageData(project, 'analyze', base))
  }

  // default selections when a dataset loads
  useEffect(() => {
    if (!ds) return
    const nums = numericVars(ds)
    const cats = categoricalVars(ds)
    // outcomes conventionally sit at the END of a dataset (demographics first,
    // DV last) — defaulting to nums[0] showed a null t-test on `age` while the
    // demo's real effects sat untouched on `satisfaction`
    const dv = nums[nums.length - 1] ?? ''
    setSel({
      corr: nums.slice(0, 8),
      rel: scaleFamily(nums),
      ttDV: dv,
      // the t-test needs exactly 2 levels and ANOVA wants 3+ — defaulting both
      // to cats[0] left one of them on a factor it can't use
      ttG: cats.find((c) => levelsOf(ds, c).length === 2) ?? cats[0] ?? '',
      anDV: dv,
      anF: cats.find((c) => levelsOf(ds, c).length >= 3) ?? cats[0] ?? '',
    })
  }, [ds])

  function loadPaste() {
    const res = parseDelimited(paste, 'Pasted data')
    if ('error' in res) {
      setError(res.error)
      return
    }
    adopt(res)
  }
  async function loadFile(file: File) {
    const text = await file.text()
    const res = parseDelimited(text, file.name)
    if ('error' in res) {
      setError(res.error)
      return
    }
    adopt(res)
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

  // ── auto-recorded run log (audit B13) ──────────────────────────────────────
  // Every analysis configuration that produced output is recorded as it
  // renders, capture or not — so the exported log can distinguish "ran" from
  // "chose to report" instead of being an author-curated selection only.
  const runLog = ((project.stages.analyze?.data as { runLog?: { sig: string; at: number }[] } | undefined)?.runLog) || []
  useEffect(() => {
    if (!ds) return
    let sig = ''
    if (analysis === 'descriptives') sig = `Descriptives — all numeric variables (${ds.name})`
    else if (analysis === 'correlations' && sel.corr.length >= 2) sig = `Correlations — ${[...sel.corr].sort().join(', ')} (${ds.name})`
    else if (analysis === 'reliability' && sel.rel.length >= 2) sig = `Reliability (α/ω) — ${[...sel.rel].sort().join(', ')} (${ds.name})`
    else if (analysis === 'ttest' && sel.ttDV && sel.ttG) sig = `t-test — ${sel.ttDV} by ${sel.ttG} (${ds.name})`
    else if (analysis === 'anova' && sel.anDV && sel.anF) sig = `ANOVA — ${sel.anDV} by ${sel.anF} (${ds.name})`
    if (!sig || runLog.some((r) => r.sig === sig)) return
    onChange(
      setStageData(project, 'analyze', {
        ...(project.stages.analyze.data || {}),
        runLog: [...runLog, { sig, at: Date.now() }].slice(-200),
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, sel, ds])
  // round-trip from the full engine (audit B9): results computed in ToolsScope
  // (mediation, regression, CFA…) can be pasted back so the analysis log and
  // Write-stage pull contain the focal test too — provenance kept in the title
  const [extText, setExtText] = useState('')
  function addExternal() {
    const t = extText.trim()
    if (!t) return
    capture('External result — computed in ToolsScope', t)
    setExtText('')
  }

  /** Reproducibility artifact: a markdown log of every captured analysis, in
   *  chronological order, with dataset + design context — this is the
   *  "analysis log" the Publish-stage open-science checklist asks you to share. */
  function exportLog() {
    const lines: string[] = [
      `# Analysis log — ${project.title || 'Untitled study'}`,
      '',
      `Generated ${new Date().toISOString()} by Throughline Studio (ToolsScope engine — dependency-free, textbook-verified).`,
      `Design on file: ${frame.design || '—'}`,
      ds
        ? `Dataset: ${ds.name} — ${ds.rows.length} rows × ${ds.variables.length} variables${ds.simulated ? ' (SIMULATED demo data — not real observations)' : ''}`
        : 'Dataset: (not loaded at export time)',
      '',
      '## Captured results (chronological)',
    ]
    for (const c of [...captures].reverse()) {
      lines.push('', `### ${c.title} — ${new Date(c.at).toISOString()}`, '', c.apa)
    }
    if (runLog.length) {
      lines.push(
        '',
        '## All analyses run (auto-recorded)',
        '',
        'Every analysis configuration that produced output in this project, captured or not — recorded automatically at first run. Compare against the captured results above to see what was run but not reported.',
        '',
      )
      for (const r of runLog) lines.push(`- ${new Date(r.at).toISOString()} — ${r.sig}`)
    }
    lines.push(
      '',
      '---',
      'Captured results are the author\'s selection for the write-up; the auto-recorded list above it is the run record. Share this log alongside the data so each result can be re-derived.',
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'analysis-log.md'
    a.click()
    URL.revokeObjectURL(a.href)
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
          <button className="btn btn-ghost" onClick={() => adopt(makeDemo())}>
            Load simulated demo
          </button>
        </div>
        {/* method precedent reads well BEFORE the data lands too */}
        <ReadingFacets
          project={project}
          keys={['analysis', 'software']}
          lead="Analyses and software your reading-list papers used — the methodological precedent for this design."
        />
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
          <button className="btn btn-ghost btn-sm" onClick={clearDataset}>
            Change data
          </button>
        </div>
        <p className="anz-ds-meta">
          {ds.rows.length.toLocaleString()} rows · {ds.variables.length} variables
          {savedDs?.name === ds.name
            ? ' · saved with this project'
            : ' · too large to save with the project — reload it next session'}
        </p>
        <div className="anz-var-chips">
          {ds.variables.map((v) => (
            <span key={v.name} className={`anz-var anz-var-${v.type}`}>
              {v.name}
            </span>
          ))}
        </div>
      </div>

      {crossSectional && (
        <p className="anz-warn">
          Design on file: <strong>correlational / survey</strong>. Cross-sectional, single-source data support
          associations — not causal claims.
          {frame.mediators?.trim()
            ? ' The mediation you framed is a causal model this design cannot establish: report indirect effects as consistent with the model, not evidence for it, and say so in the limitations.'
            : ' Write the results in the language of association.'}
        </p>
      )}
      {nestedDesign && (
        <p className="anz-warn">
          Design on file: <strong>nested / repeated observations</strong>. Every test in this embedded engine assumes
          independent rows — clustered data violate that, so flat results here overstate significance. Use multilevel
          models for the focal tests (not available in this engine); treat anything computed below as descriptive
          only, and say which level each claim lives at.
        </p>
      )}
      {qualDesign && (
        <p className="anz-warn">
          Design on file: <strong>qualitative</strong>. This engine is quantitative — for your focal analysis, code
          themes in ToolsScope's qualitative workbench (highlight-and-code, themes, co-occurrence) via the link
          below. Numbers computed here apply only to any supplementary quantitative data you collected.
        </p>
      )}

      {/* suggested analyses — deterministic, from the framed design */}
      {framedAnything && suggestions.length > 0 && (
        <div className="anz-ds" style={{ marginBottom: 14 }}>
          <p className="anz-ds-meta" style={{ marginTop: 0 }}>
            <strong>Suggested from your framed design</strong> — derived from Frame (no AI); the framing decides, you judge.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {suggestions.map((s) => (
              <li key={s.label} style={{ marginBottom: 6 }}>
                {s.run ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAnalysis(s.run!)}>
                    {s.label}
                  </button>
                ) : (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={deepLink(stageDef('analyze').tools[0], topic)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.label} ↗
                  </a>
                )}{' '}
                <span className="disc-dim">— {s.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* analyses + software the reading list used — method-precedent context */}
      <ReadingFacets
        project={project}
        keys={['analysis', 'software']}
        lead="Analyses and software your reading-list papers used — the methodological precedent for this design. Run the staples here; the deeper engines are one click away in ToolsScope."
      />

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

      {/* round-trip: paste the focal test back from the full engine */}
      <div className="anz-ds" style={{ marginTop: 14 }}>
        <p className="anz-ds-meta" style={{ marginTop: 0 }}>
          <strong>Ran the focal test in ToolsScope?</strong> Paste its APA result line here so the analysis log and
          the Write stage carry it too — it is captured verbatim, marked as external.
        </p>
        <textarea
          className="bld-textarea"
          rows={2}
          value={extText}
          onChange={(e) => setExtText(e.target.value)}
          placeholder="e.g. the mediation (Model 4) write-up copied from ToolsScope"
        />
        <button className="btn btn-ghost btn-sm" onClick={addExternal} disabled={!extText.trim()} style={{ marginTop: 6 }}>
          <Icon name="plus" size={14} /> Capture external result
        </button>
      </div>

      {/* captured results — the carry-forward */}
      {captures.length > 0 && (
        <div className="anz-captures">
          <div className="anz-cap-head">
            <h3 className="anz-cap-h">Captured for the write-up ({captures.length})</h3>
            <button className="btn btn-ghost btn-sm" onClick={exportLog}>
              <Icon name="publish" size={14} /> Export analysis log
            </button>
          </div>
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
          <p className="anz-fineprint">Pearson r. * p&lt;.05, ** p&lt;.01, *** p&lt;.001. Pairwise N. Focal-pair 95% CI via Fisher z.</p>
          {cm.vars.length === 2 ? (() => {
            // a focal pair deserves the full APA sentence with an interval,
            // not just a matrix cell (audit B15a)
            const cols = colsByName(ds)
            const a = cols[cm.vars[0]] || []
            const b = cols[cm.vars[1]] || []
            let n = 0
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
              if (Number.isFinite(a[i]) && Number.isFinite(b[i])) n++
            }
            const r = cm.r[1][0]
            const p = cm.p[1][0]
            if (n > 3 && Math.abs(r) < 1) {
              const z = Math.atanh(r)
              const se = 1 / Math.sqrt(n - 3)
              const lo = Math.tanh(z - 1.96 * se)
              const hi = Math.tanh(z + 1.96 * se)
              return (
                <ApaLine
                  text={`${cm.vars[0]} and ${cm.vars[1]} were ${p < 0.05 ? 'significantly ' : ''}correlated, r(${n - 2}) = ${rfmt(r)}, 95% CI [${rfmt(lo)}, ${rfmt(hi)}], p ${pfmt(p)} (N = ${n}).`}
                  title="Correlation (focal pair)"
                  onCapture={onCapture}
                />
              )
            }
            return null
          })() : (
            <ApaLine
              text={`A Pearson correlation matrix was computed among ${cm.vars.length} variables (pairwise N up to ${ds.rows.length}).`}
              title="Correlation matrix"
              onCapture={onCapture}
            />
          )}
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
          <p className="anz-fineprint">α (Cronbach's alpha) is internal consistency — how strongly the items hang together, from 0 to 1. * ω is a single-factor approximation — run a factor model in ToolsScope for a full estimate.</p>
          <ApaLine
            text={`Internal consistency was ${alphaQualifier(rel.alpha)}, Cronbach's α = ${rfmt(rel.alpha)} for the ${rel.k}-item scale (N = ${rel.n}).`}
            title="Reliability (Cronbach's α)"
            onCapture={onCapture}
          />
        </>
      )}
    </>
  )
}

/** The adjective must follow the value (George & Mallery 2003 bands) — a fixed
 *  "acceptable" once shipped α = .21 into auto-APA prose. */
function alphaQualifier(a: number): string {
  if (a >= 0.9) return 'excellent'
  if (a >= 0.8) return 'good'
  if (a >= 0.7) return 'acceptable'
  if (a >= 0.6) return 'questionable'
  return 'poor'
}

/** Default reliability selection: the largest family of columns sharing an
 *  alphabetic stem (eng1…eng5), not every numeric column — α over unrelated
 *  variables (age + items) is a novice trap. Falls back to the first six. */
function scaleFamily(nums: string[]): string[] {
  const fams = new Map<string, string[]>()
  for (const v of nums) {
    const m = v.match(/^(.*?)[_\s.-]?\d+$/)
    if (!m || !m[1]) continue
    const stem = m[1].toLowerCase()
    fams.set(stem, [...(fams.get(stem) || []), v])
  }
  let best: string[] = []
  for (const f of fams.values()) if (f.length > best.length) best = f
  return best.length >= 2 ? best : nums.slice(0, 6)
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
      {res && (() => {
        // 95% CI for d via the large-sample SE (Hedges & Olkin approximation)
        const n1 = res.gv[0].values.length
        const n2 = res.gv[1].values.length
        const seD = Math.sqrt((n1 + n2) / (n1 * n2) + (res.t.cohensD * res.t.cohensD) / (2 * (n1 + n2)))
        const dLo = res.t.cohensD - 1.96 * seD
        const dHi = res.t.cohensD + 1.96 * seD
        const dCI = `[${f2(dLo)}, ${f2(dHi)}]`
        return (
          <>
            <div className="anz-stat-row">
              <Stat label={`${res.gv[0].level} (M, SD)`} value={`${f2(res.t.m1)}, ${f2(res.t.sd1)}`} />
              <Stat label={`${res.gv[1].level} (M, SD)`} value={`${f2(res.t.m2)}, ${f2(res.t.sd2)}`} />
              <Stat label="t" value={f2(res.t.t)} />
              <Stat label="df" value={f2(res.t.df, 1)} />
              <Stat label="p" value={pfmt(res.t.p)} />
              <Stat label="Cohen's d" value={f2(res.t.cohensD)} />
              <Stat label="d 95% CI" value={dCI} />
            </div>
            <ApaLine
              text={`A Welch independent-samples t-test compared ${sel.ttDV} between ${res.gv[0].level} (M = ${f2(res.t.m1)}, SD = ${f2(res.t.sd1)}) and ${res.gv[1].level} (M = ${f2(res.t.m2)}, SD = ${f2(res.t.sd2)}), t(${f2(res.t.df, 1)}) = ${f2(res.t.t)}, p ${pfmt(res.t.p)}, d = ${f2(res.t.cohensD)}, 95% CI ${dCI}.`}
              title="Independent t-test"
              onCapture={onCapture}
            />
            <p className="anz-fineprint">
              Welch's t is robust to unequal variances, but check the outcome's skew/kurtosis in Descriptives first —
              with marked non-normality, the Mann–Whitney test in ToolsScope is the safer call.
            </p>
          </>
        )
      })()}
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
          <p className="anz-fineprint">
            η² is a point estimate — an exact (noncentral-F) confidence interval is beyond this embedded engine.
            Report the size band with that caveat, or compute the interval in the full engine. ANOVA also assumes
            roughly normal residuals and similar group variances — eyeball the group SDs above; Kruskal–Wallis in
            ToolsScope is the robust alternative.
          </p>
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
          {toolLabel(t)} <Icon name="external" size={12} />
        </a>
      </div>
    </div>
  )
}
