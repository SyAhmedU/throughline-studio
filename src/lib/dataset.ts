// ============================================================================
// Throughline Studio — Analyze stage data model.
// A small, dependency-free tabular dataset: parse pasted/uploaded CSV-TSV,
// auto-detect variable types, and expose column accessors the stats engine
// consumes. Plus a clearly-labelled SIMULATED demo dataset (no real data is
// ever invented — synthetic sample data is allowed only when labelled).
// ============================================================================

import type { Cell } from './stats'

export type VarType = 'numeric' | 'categorical'

export interface Variable {
  name: string
  type: VarType
}

export interface Dataset {
  name: string
  variables: Variable[]
  rows: Cell[][] // row-major; rows[i][j] aligns with variables[j]
  /** true for the built-in demo so the UI can badge it "simulated" */
  simulated?: boolean
}

// CSV/TSV field parser — respects double-quoted fields with embedded
// delimiters and escaped quotes (""). Doesn't span newlines inside quotes
// (acceptable for paste/upload).
function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function detectType(values: Cell[]): VarType {
  let nums = 0,
    nonNull = 0
  for (const v of values) {
    if (v === null || v === '') continue
    nonNull++
    if (typeof v === 'number') nums++
  }
  if (nonNull === 0) return 'categorical'
  return nums / nonNull >= 0.8 ? 'numeric' : 'categorical'
}

function dedupeHeaders(header: string[]): string[] {
  const seen = new Map<string, number>()
  return header.map((h, j) => {
    let name = h.trim() || `V${j + 1}`
    if (seen.has(name)) {
      const c = seen.get(name)! + 1
      seen.set(name, c)
      name = `${name}_${c}`
    } else seen.set(name, 1)
    return name
  })
}

export function parseDelimited(text: string, name = 'Pasted data'): Dataset | { error: string } {
  const clean = text.replace(/\r\n?/g, '\n').trim()
  if (!clean) return { error: 'No data found.' }
  const lines = clean.split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) return { error: 'Need a header row plus at least one data row.' }
  const tabs = lines[0].split('\t').length
  const commas = lines[0].split(',').length
  const delim = tabs > commas ? '\t' : ','
  const header = dedupeHeaders(splitLine(lines[0], delim))
  const ncol = header.length
  const rows: Cell[][] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i], delim)
    const row: Cell[] = []
    for (let j = 0; j < ncol; j++) {
      const raw = parts[j] ?? ''
      if (raw === '') row.push(null)
      else {
        const num = Number(raw)
        row.push(Number.isFinite(num) ? num : raw)
      }
    }
    rows.push(row)
  }
  const variables: Variable[] = header.map((h, j) => ({
    name: h,
    type: detectType(rows.map((r) => r[j])),
  }))
  return { name, variables, rows }
}

function csvField(v: Cell): string {
  if (v === null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** Serialize back to CSV (round-trips through parseDelimited) — used to
 *  persist the loaded dataset on the project. */
export function toDelimited(ds: Dataset): string {
  const lines = [ds.variables.map((v) => csvField(v.name)).join(',')]
  for (const r of ds.rows) lines.push(r.map(csvField).join(','))
  return lines.join('\n')
}

// ── column accessors ───────────────────────────────────────────────────────
export function column(ds: Dataset, name: string): Cell[] {
  const j = ds.variables.findIndex((v) => v.name === name)
  return j < 0 ? [] : ds.rows.map((r) => r[j])
}

export function colsByName(ds: Dataset): Record<string, Cell[]> {
  const out: Record<string, Cell[]> = {}
  ds.variables.forEach((v, j) => {
    out[v.name] = ds.rows.map((r) => r[j])
  })
  return out
}

export const numericVars = (ds: Dataset): string[] =>
  ds.variables.filter((v) => v.type === 'numeric').map((v) => v.name)

export const categoricalVars = (ds: Dataset): string[] =>
  ds.variables.filter((v) => v.type === 'categorical').map((v) => v.name)

export function levelsOf(ds: Dataset, name: string): string[] {
  const set = new Set<string>()
  for (const c of column(ds, name)) {
    if (c === null || c === '') continue
    set.add(String(c))
  }
  return [...set].sort()
}

/** Numeric DV values grouped by the levels of a factor (drops missing). */
export function groupValues(
  ds: Dataset,
  dv: string,
  factor: string,
): { level: string; values: number[] }[] {
  const dvCol = column(ds, dv)
  const fCol = column(ds, factor)
  const map = new Map<string, number[]>()
  for (let i = 0; i < ds.rows.length; i++) {
    const f = fCol[i]
    if (f === null || f === '') continue
    const d = dvCol[i]
    const num = d === null ? NaN : Number(d)
    if (!Number.isFinite(num)) continue
    const key = String(f)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(num)
  }
  return [...map.entries()].map(([level, values]) => ({ level, values }))
}

// ── simulated demo dataset (deterministic; labelled simulated) ──────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeDemo(): Dataset {
  const rng = mulberry32(20260609)
  const gauss = (): number => {
    let u = 0,
      v = 0
    while (u === 0) u = rng()
    while (v === 0) v = rng()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const clampLikert = (x: number): number => Math.max(1, Math.min(7, Math.round(x)))
  const groups = ['A', 'B', 'C']
  const groupEffect: Record<string, number> = { A: 0, B: 0.45, C: -0.35 }

  const variables: Variable[] = [
    { name: 'group', type: 'categorical' },
    { name: 'condition', type: 'categorical' }, // 2 levels so the t-test demos out of the box
    { name: 'age', type: 'numeric' },
    { name: 'eng1', type: 'numeric' },
    { name: 'eng2', type: 'numeric' },
    { name: 'eng3', type: 'numeric' },
    { name: 'eng4', type: 'numeric' },
    { name: 'eng5', type: 'numeric' },
    { name: 'satisfaction', type: 'numeric' },
  ]

  const rows: Cell[][] = []
  for (let i = 0; i < 120; i++) {
    const group = groups[i % 3]
    const condition = i % 2 === 0 ? 'control' : 'treatment'
    const theta = gauss() // latent engagement
    const eng = [0, 0, 0, 0, 0].map(() => clampLikert(4.2 + 1.0 * theta + 0.7 * gauss()))
    const satisfaction = clampLikert(
      3.9 + 0.6 * theta + 1.3 * groupEffect[group] + (condition === 'treatment' ? 0.5 : 0) + 0.7 * gauss(),
    )
    const age = Math.max(18, Math.min(64, Math.round(34 + 9 * gauss())))
    rows.push([group, condition, age, eng[0], eng[1], eng[2], eng[3], eng[4], satisfaction])
  }

  return { name: 'Simulated demo — work engagement (N=120)', variables, rows, simulated: true }
}
