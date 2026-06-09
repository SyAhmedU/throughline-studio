// ============================================================================
// Throughline Studio — statistics engine.
// Ported VERBATIM from ToolsScope's verified, dependency-free engine
// (toolsscope/src/lib/stats.ts — tested against textbook values). Correctness
// over breadth: every p-value comes from a real distribution tail (incomplete
// beta / gamma), not a normal-approximation shortcut. Do not "simplify" these
// special functions — they are the audited core.
//
// Special-function implementations follow Numerical Recipes / Abramowitz &
// Stegun (continued-fraction / series methods).
// ============================================================================

export type Cell = number | string | null

export interface DescriptiveRow {
  variable: string
  n: number
  missing: number
  mean: number
  sd: number
  min: number
  max: number
  median: number
  skewness: number
  kurtosis: number
}

export interface ReliabilityResult {
  items: string[]
  n: number
  k: number
  alpha: number
  omega?: number
  itemTotal: { item: string; corrected_r: number; alpha_if_deleted: number }[]
  reversedSuggestions: string[]
}

export interface CorrelationResult {
  vars: string[]
  r: number[][]
  p: number[][]
  n: number[][]
  method: 'pearson' | 'spearman'
}

export interface TTestResult {
  kind: 'independent' | 'paired' | 'one-sample'
  groups?: [string, string]
  m1: number
  m2: number
  sd1: number
  sd2: number
  n1: number
  n2: number
  t: number
  df: number
  p: number
  meanDiff: number
  cohensD: number
  ci95: [number, number]
}

export interface AnovaResult {
  factor: string
  dv: string
  groups: { level: string; n: number; mean: number; sd: number }[]
  fStat: number
  dfBetween: number
  dfWithin: number
  p: number
  etaSquared: number
  postHoc?: { a: string; b: string; meanDiff: number; p: number }[]
}

// ---------------------------------------------------------------------------
// Special functions
// ---------------------------------------------------------------------------

export function gammln(xx: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let x = xx,
    y = xx
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) {
    y += 1
    ser += cof[j] / y
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200,
    EPS = 3e-12,
    FPMIN = 1e-300
  let qab = a + b,
    qap = a + 1,
    qam = a - 1
  let c = 1,
    d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

function gser(a: number, x: number): number {
  const ITMAX = 300,
    EPS = 3e-12
  if (x <= 0) return 0
  const gln = gammln(a)
  let ap = a,
    sum = 1 / a,
    del = sum
  for (let n = 0; n < ITMAX; n++) {
    ap += 1
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * EPS) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln)
}

function gcf(a: number, x: number): number {
  const ITMAX = 300,
    EPS = 3e-12,
    FPMIN = 1e-300
  const gln = gammln(a)
  let b = x + 1 - a,
    c = 1 / FPMIN,
    d = 1 / b,
    h = d
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h
}

export function gammp(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN
  if (x < a + 1) return gser(a, x)
  return 1 - gcf(a, x)
}
export function gammq(a: number, x: number): number {
  return 1 - gammp(a, x)
}

export function erf(x: number): number {
  return x < 0 ? -gammp(0.5, x * x) : gammp(0.5, x * x)
}
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

export function tTwoTailedP(t: number, df: number): number {
  if (df <= 0) return NaN
  return betai(df / 2, 0.5, df / (df + t * t))
}
export function fUpperP(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1
  return betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f))
}
export function chiSqUpperP(x: number, df: number): number {
  if (x <= 0) return 1
  return gammq(df / 2, x / 2)
}

// ---------------------------------------------------------------------------
// Descriptive helpers
// ---------------------------------------------------------------------------

export function toNumbers(col: Cell[]): number[] {
  const out: number[] = []
  for (const c of col) {
    if (c === null || c === '') continue
    const n = typeof c === 'number' ? c : Number(c)
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

export function variance(xs: number[], sample = true): number {
  const m = mean(xs)
  const ss = xs.reduce((a, b) => a + (b - m) ** 2, 0)
  return ss / (xs.length - (sample ? 1 : 0))
}
export const sd = (xs: number[], sample = true): number => Math.sqrt(variance(xs, sample))

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return NaN
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

export function skewness(xs: number[]): number {
  const n = xs.length,
    m = mean(xs),
    s = sd(xs)
  if (n < 3 || s === 0) return NaN
  const sum = xs.reduce((a, b) => a + ((b - m) / s) ** 3, 0)
  return (n / ((n - 1) * (n - 2))) * sum
}
export function kurtosis(xs: number[]): number {
  const n = xs.length,
    m = mean(xs),
    s = sd(xs)
  if (n < 4 || s === 0) return NaN
  const sum = xs.reduce((a, b) => a + ((b - m) / s) ** 4, 0)
  return (
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
  )
}

export function describe(name: string, col: Cell[]): DescriptiveRow {
  const xs = toNumbers(col)
  const missing = col.length - xs.length
  if (xs.length === 0) {
    return { variable: name, n: 0, missing, mean: NaN, sd: NaN, min: NaN, max: NaN, median: NaN, skewness: NaN, kurtosis: NaN }
  }
  return {
    variable: name,
    n: xs.length,
    missing,
    mean: mean(xs),
    sd: xs.length > 1 ? sd(xs) : NaN,
    min: Math.min(...xs),
    max: Math.max(...xs),
    median: median(xs),
    skewness: skewness(xs),
    kurtosis: kurtosis(xs),
  }
}

// ---------------------------------------------------------------------------
// Reliability — Cronbach's alpha, item-total, alpha-if-deleted, ω (approx)
// ---------------------------------------------------------------------------

function completeMatrix(cols: Record<string, Cell[]>, items: string[]): number[][] {
  const n = cols[items[0]]?.length ?? 0
  const rows: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    let ok = true
    for (const it of items) {
      const c = cols[it][i]
      const v = c === null || c === '' ? NaN : Number(c)
      if (!Number.isFinite(v)) {
        ok = false
        break
      }
      row.push(v)
    }
    if (ok) rows.push(row)
  }
  return rows
}

function pearson(x: number[], y: number[]): number {
  const n = x.length
  if (n < 2) return NaN
  const mx = mean(x),
    my = mean(y)
  let sxy = 0,
    sxx = 0,
    syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx,
      dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return NaN
  return sxy / Math.sqrt(sxx * syy)
}

export function cronbach(cols: Record<string, Cell[]>, items: string[]): ReliabilityResult {
  const M = completeMatrix(cols, items)
  const n = M.length,
    k = items.length
  const alphaOf = (rows: number[][], cols2: number) => {
    if (rows.length < 2 || cols2 < 2) return NaN
    const itemVars: number[] = []
    for (let j = 0; j < cols2; j++) itemVars.push(variance(rows.map((r) => r[j])))
    const totals = rows.map((r) => r.reduce((a, b) => a + b, 0))
    const totVar = variance(totals)
    const sumItemVar = itemVars.reduce((a, b) => a + b, 0)
    return (cols2 / (cols2 - 1)) * (1 - sumItemVar / totVar)
  }

  const alpha = alphaOf(M, k)

  const itemTotal = items.map((it, j) => {
    const rest = M.map((r) => r.reduce((a, b, idx) => a + (idx === j ? 0 : b), 0))
    const itemCol = M.map((r) => r[j])
    const corrected_r = pearson(itemCol, rest)
    const reducedItems = items.filter((_, idx) => idx !== j)
    const reducedRows = M.map((r) => r.filter((_, idx) => idx !== j))
    const alpha_if_deleted = alphaOf(reducedRows, reducedItems.length)
    return { item: it, corrected_r, alpha_if_deleted }
  })

  let omega: number | undefined
  const rs: number[] = []
  for (let a = 0; a < k; a++)
    for (let b = a + 1; b < k; b++) rs.push(pearson(M.map((r) => r[a]), M.map((r) => r[b])))
  const rbar = rs.length ? mean(rs.filter(Number.isFinite)) : NaN
  if (Number.isFinite(rbar) && rbar > 0) {
    const lambda = Math.sqrt(rbar)
    const sumL = k * lambda
    const sumErr = k * (1 - lambda * lambda)
    omega = (sumL * sumL) / (sumL * sumL + sumErr)
  }

  const reversedSuggestions = itemTotal.filter((t) => t.corrected_r < 0).map((t) => t.item)
  return { items, n, k, alpha, omega, itemTotal, reversedSuggestions }
}

// ---------------------------------------------------------------------------
// Correlation matrix (Pearson or Spearman) with p-values
// ---------------------------------------------------------------------------

function rankTransform(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0])
  const ranks = new Array(xs.length).fill(0)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg
    i = j + 1
  }
  return ranks
}

export function correlationMatrix(
  cols: Record<string, Cell[]>,
  vars: string[],
  method: 'pearson' | 'spearman' = 'pearson',
): CorrelationResult {
  const k = vars.length
  const r = Array.from({ length: k }, () => new Array(k).fill(NaN))
  const p = Array.from({ length: k }, () => new Array(k).fill(NaN))
  const nMat = Array.from({ length: k }, () => new Array(k).fill(0))
  for (let a = 0; a < k; a++) {
    for (let b = a; b < k; b++) {
      const xa: number[] = [],
        xb: number[] = []
      const ca = cols[vars[a]],
        cb = cols[vars[b]]
      for (let i = 0; i < ca.length; i++) {
        const va = ca[i] === null || ca[i] === '' ? NaN : Number(ca[i])
        const vb = cb[i] === null || cb[i] === '' ? NaN : Number(cb[i])
        if (Number.isFinite(va) && Number.isFinite(vb)) {
          xa.push(va)
          xb.push(vb)
        }
      }
      const n = xa.length
      let rv: number
      if (method === 'spearman') rv = pearson(rankTransform(xa), rankTransform(xb))
      else rv = pearson(xa, xb)
      let pv = NaN
      if (n > 2 && Number.isFinite(rv) && Math.abs(rv) < 1) {
        const t = rv * Math.sqrt((n - 2) / (1 - rv * rv))
        pv = tTwoTailedP(t, n - 2)
      } else if (Math.abs(rv) >= 1 && n > 2) pv = 0
      r[a][b] = r[b][a] = a === b ? 1 : rv
      p[a][b] = p[b][a] = a === b ? 0 : pv
      nMat[a][b] = nMat[b][a] = n
    }
  }
  return { vars, r, p, n: nMat, method }
}

// ---------------------------------------------------------------------------
// t-tests
// ---------------------------------------------------------------------------

export function independentTTest(g1: number[], g2: number[], welch = true): TTestResult {
  const n1 = g1.length,
    n2 = g2.length
  const m1 = mean(g1),
    m2 = mean(g2)
  const v1 = variance(g1),
    v2 = variance(g2)
  const sd1 = Math.sqrt(v1),
    sd2 = Math.sqrt(v2)
  let t: number, df: number, seDiff: number
  if (welch) {
    seDiff = Math.sqrt(v1 / n1 + v2 / n2)
    t = (m1 - m2) / seDiff
    df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
  } else {
    const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
    seDiff = Math.sqrt(sp2 * (1 / n1 + 1 / n2))
    t = (m1 - m2) / seDiff
    df = n1 + n2 - 2
  }
  const p = tTwoTailedP(t, df)
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
  const d = (m1 - m2) / sp
  const tcrit = tCritical(0.05, df)
  const md = m1 - m2
  return {
    kind: 'independent',
    m1,
    m2,
    sd1,
    sd2,
    n1,
    n2,
    t,
    df,
    p,
    meanDiff: md,
    cohensD: d,
    ci95: [md - tcrit * seDiff, md + tcrit * seDiff],
  }
}

export function pairedTTest(x: number[], y: number[]): TTestResult {
  const n = Math.min(x.length, y.length)
  const diffs: number[] = []
  for (let i = 0; i < n; i++) diffs.push(x[i] - y[i])
  const md = mean(diffs),
    sdd = sd(diffs)
  const se = sdd / Math.sqrt(n)
  const t = md / se,
    df = n - 1
  const p = tTwoTailedP(t, df)
  const d = md / sdd
  const tcrit = tCritical(0.05, df)
  return {
    kind: 'paired',
    m1: mean(x),
    m2: mean(y),
    sd1: sd(x),
    sd2: sd(y),
    n1: n,
    n2: n,
    t,
    df,
    p,
    meanDiff: md,
    cohensD: d,
    ci95: [md - tcrit * se, md + tcrit * se],
  }
}

export function tCritical(alpha: number, df: number): number {
  let lo = 0,
    hi = 1000
  const target = alpha
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const p = tTwoTailedP(mid, df)
    if (p > target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ---------------------------------------------------------------------------
// One-way ANOVA + eta squared + Bonferroni post-hoc
// ---------------------------------------------------------------------------

export function oneWayAnova(
  dv: string,
  factor: string,
  groups: { level: string; values: number[] }[],
): AnovaResult {
  const all = groups.flatMap((g) => g.values)
  const grand = mean(all)
  const N = all.length,
    kG = groups.length
  let ssB = 0,
    ssW = 0
  const summary = groups.map((g) => {
    const m = mean(g.values)
    ssB += g.values.length * (m - grand) ** 2
    for (const v of g.values) ssW += (v - m) ** 2
    return { level: g.level, n: g.values.length, mean: m, sd: g.values.length > 1 ? sd(g.values) : NaN }
  })
  const dfB = kG - 1,
    dfW = N - kG
  const msB = ssB / dfB,
    msW = ssW / dfW
  const F = msB / msW
  const p = fUpperP(F, dfB, dfW)
  const etaSquared = ssB / (ssB + ssW)

  const pairs = (kG * (kG - 1)) / 2
  const postHoc: { a: string; b: string; meanDiff: number; p: number }[] = []
  for (let i = 0; i < kG; i++)
    for (let j = i + 1; j < kG; j++) {
      const gi = groups[i].values,
        gj = groups[j].values
      const t = independentTTest(gi, gj, false)
      postHoc.push({ a: groups[i].level, b: groups[j].level, meanDiff: t.m1 - t.m2, p: Math.min(1, t.p * pairs) })
    }
  return { factor, dv, groups: summary, fStat: F, dfBetween: dfB, dfWithin: dfW, p, etaSquared, postHoc }
}
