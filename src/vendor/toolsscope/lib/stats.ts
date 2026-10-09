// ToolsScope statistics engine — pure, dependency-free, and deterministic.
// These functions replicate the core analyses researchers report in papers
// (the SPSS/R/jamovi staples). Correctness matters more than breadth: every
// p-value here comes from a real distribution tail (incomplete beta / gamma),
// not a normal-approximation shortcut.
//
// Special-function implementations (gammln, betai, gammp/gammq) follow the
// standard continued-fraction / series methods (Numerical Recipes, Abramowitz
// & Stegun). Tested against known textbook values.

import type {
  Cell, DescriptiveRow, ReliabilityResult, CorrelationResult,
  TTestResult, AnovaResult, RegressionResult, ChiSquareResult,
  FactorAnalysisResult, MannWhitneyResult, WilcoxonResult, KruskalWallisResult,
  MediationResult, ModerationResult,
  TwoWayAnovaResult, RepeatedMeasuresResult, IccResult, LogisticRegressionResult, CohensKappaResult, PoissonRegressionResult,
  PartialCorrelationResult, AncovaResult,
  CfaResult, CfaLoading,
} from './types';

// ---------------------------------------------------------------------------
// Special functions
// ---------------------------------------------------------------------------

export function gammln(xx: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = xx, y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Continued fraction for the incomplete beta function.
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularised incomplete beta I_x(a,b).
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Regularised lower incomplete gamma P(a,x) via series.
function gser(a: number, x: number): number {
  const ITMAX = 300, EPS = 3e-12;
  if (x <= 0) return 0;
  const gln = gammln(a);
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 0; n < ITMAX; n++) {
    ap += 1; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

// Regularised upper incomplete gamma Q(a,x) via continued fraction.
function gcf(a: number, x: number): number {
  const ITMAX = 300, EPS = 3e-12, FPMIN = 1e-300;
  const gln = gammln(a);
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

export function gammp(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x < a + 1) return gser(a, x);
  return 1 - gcf(a, x);
}
export function gammq(a: number, x: number): number {
  return 1 - gammp(a, x);
}

export function erf(x: number): number {
  return x < 0 ? -gammp(0.5, x * x) : gammp(0.5, x * x);
}
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// ---- distribution tail p-values ----
export function tTwoTailedP(t: number, df: number): number {
  if (df <= 0) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}
export function fUpperP(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  return betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}
export function chiSqUpperP(x: number, df: number): number {
  if (x <= 0) return 1;
  return gammq(df / 2, x / 2);
}

// ---------------------------------------------------------------------------
// Basic descriptive helpers
// ---------------------------------------------------------------------------

export function toNumbers(col: Cell[]): number[] {
  const out: number[] = [];
  for (const c of col) {
    if (c === null || c === '') continue;
    const n = typeof c === 'number' ? c : Number(c);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

export function variance(xs: number[], sample = true): number {
  const m = mean(xs);
  const ss = xs.reduce((a, b) => a + (b - m) ** 2, 0);
  return ss / (xs.length - (sample ? 1 : 0));
}
export const sd = (xs: number[], sample = true): number => Math.sqrt(variance(xs, sample));

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

export function skewness(xs: number[]): number {
  const n = xs.length, m = mean(xs), s = sd(xs);
  if (n < 3 || s === 0) return NaN;
  const sum = xs.reduce((a, b) => a + ((b - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}
export function kurtosis(xs: number[]): number {
  const n = xs.length, m = mean(xs), s = sd(xs);
  if (n < 4 || s === 0) return NaN;
  const sum = xs.reduce((a, b) => a + ((b - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum
    - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3)); // excess kurtosis
}

// ---------------------------------------------------------------------------
// Descriptives
// ---------------------------------------------------------------------------

export function describe(name: string, col: Cell[]): DescriptiveRow {
  const xs = toNumbers(col);
  const missing = col.length - xs.length;
  if (xs.length === 0) {
    return { variable: name, n: 0, missing, mean: NaN, sd: NaN, min: NaN, max: NaN, median: NaN, skewness: NaN, kurtosis: NaN };
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
  };
}

// ---------------------------------------------------------------------------
// Reliability — Cronbach's alpha, item-total, alpha-if-deleted, ω (approx)
// ---------------------------------------------------------------------------

// Listwise-complete item matrix from named columns.
function completeMatrix(cols: Record<string, Cell[]>, items: string[]): number[][] {
  const n = cols[items[0]]?.length ?? 0;
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    let ok = true;
    for (const it of items) {
      const c = cols[it][i];
      const v = c === null || c === '' ? NaN : Number(c);
      if (!Number.isFinite(v)) { ok = false; break; }
      row.push(v);
    }
    if (ok) rows.push(row);
  }
  return rows;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return NaN;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
}

export function cronbach(cols: Record<string, Cell[]>, items: string[]): ReliabilityResult {
  const M = completeMatrix(cols, items);
  const n = M.length, k = items.length;
  const alphaOf = (rows: number[][], cols2: number) => {
    if (rows.length < 2 || cols2 < 2) return NaN;
    const itemVars: number[] = [];
    for (let j = 0; j < cols2; j++) itemVars.push(variance(rows.map(r => r[j])));
    const totals = rows.map(r => r.reduce((a, b) => a + b, 0));
    const totVar = variance(totals);
    const sumItemVar = itemVars.reduce((a, b) => a + b, 0);
    return (cols2 / (cols2 - 1)) * (1 - sumItemVar / totVar);
  };

  const alpha = alphaOf(M, k);

  // Corrected item-total correlation + alpha-if-deleted.
  const itemTotal = items.map((it, j) => {
    const rest = M.map(r => r.reduce((a, b, idx) => a + (idx === j ? 0 : b), 0));
    const itemCol = M.map(r => r[j]);
    const corrected_r = pearson(itemCol, rest);
    const reducedItems = items.filter((_, idx) => idx !== j);
    const reducedRows = M.map(r => r.filter((_, idx) => idx !== j));
    const alpha_if_deleted = alphaOf(reducedRows, reducedItems.length);
    return { item: it, corrected_r, alpha_if_deleted };
  });

  // McDonald's ω (approx): single-factor congeneric estimate from standardised
  // loadings derived via the average inter-item correlation (Spearman–Brown-ish).
  // This is a transparent approximation; a full ω needs a factor model (v2).
  let omega: number | undefined;
  const rs: number[] = [];
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) rs.push(pearson(M.map(r => r[a]), M.map(r => r[b])));
  const rbar = rs.length ? mean(rs.filter(Number.isFinite)) : NaN;
  if (Number.isFinite(rbar) && rbar > 0) {
    const lambda = Math.sqrt(rbar);                 // common standardised loading
    const sumL = k * lambda;
    const sumErr = k * (1 - lambda * lambda);
    omega = (sumL * sumL) / (sumL * sumL + sumErr);
  }

  const reversedSuggestions = itemTotal.filter(t => t.corrected_r < 0).map(t => t.item);
  return { items, n, k, alpha, omega, itemTotal, reversedSuggestions };
}

// ---------------------------------------------------------------------------
// Correlation matrix (Pearson or Spearman) with p-values
// ---------------------------------------------------------------------------

function rankTransform(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(xs.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; // average rank (1-based)
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg;
    i = j + 1;
  }
  return ranks;
}

export function correlationMatrix(
  cols: Record<string, Cell[]>, vars: string[], method: 'pearson' | 'spearman' = 'pearson',
): CorrelationResult {
  const k = vars.length;
  const r = Array.from({ length: k }, () => new Array(k).fill(NaN));
  const p = Array.from({ length: k }, () => new Array(k).fill(NaN));
  const nMat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let a = 0; a < k; a++) {
    for (let b = a; b < k; b++) {
      // pairwise complete
      const xa: number[] = [], xb: number[] = [];
      const ca = cols[vars[a]], cb = cols[vars[b]];
      for (let i = 0; i < ca.length; i++) {
        const va = ca[i] === null || ca[i] === '' ? NaN : Number(ca[i]);
        const vb = cb[i] === null || cb[i] === '' ? NaN : Number(cb[i]);
        if (Number.isFinite(va) && Number.isFinite(vb)) { xa.push(va); xb.push(vb); }
      }
      const n = xa.length;
      let rv: number;
      if (method === 'spearman') rv = pearson(rankTransform(xa), rankTransform(xb));
      else rv = pearson(xa, xb);
      let pv = NaN;
      if (n > 2 && Number.isFinite(rv) && Math.abs(rv) < 1) {
        const t = rv * Math.sqrt((n - 2) / (1 - rv * rv));
        pv = tTwoTailedP(t, n - 2);
      } else if (Math.abs(rv) >= 1 && n > 2) pv = 0;
      r[a][b] = r[b][a] = a === b ? 1 : rv;
      p[a][b] = p[b][a] = a === b ? 0 : pv;
      nMat[a][b] = nMat[b][a] = n;
    }
  }
  return { vars, r, p, n: nMat, method };
}

// ---------------------------------------------------------------------------
// t-tests
// ---------------------------------------------------------------------------

export function independentTTest(g1: number[], g2: number[], welch = true): TTestResult {
  const n1 = g1.length, n2 = g2.length;
  const m1 = mean(g1), m2 = mean(g2);
  const v1 = variance(g1), v2 = variance(g2);
  const sd1 = Math.sqrt(v1), sd2 = Math.sqrt(v2);
  let t: number, df: number, seDiff: number;
  if (welch) {
    seDiff = Math.sqrt(v1 / n1 + v2 / n2);
    t = (m1 - m2) / seDiff;
    df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  } else {
    const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    seDiff = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    t = (m1 - m2) / seDiff;
    df = n1 + n2 - 2;
  }
  const p = tTwoTailedP(t, df);
  // Cohen's d on pooled SD
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const d = (m1 - m2) / sp;
  // 95% CI of mean difference (uses normal-ish t crit via bisection-free approx)
  const tcrit = tCritical(0.05, df);
  const md = m1 - m2;
  return {
    kind: 'independent', m1, m2, sd1, sd2, n1, n2, t, df, p,
    meanDiff: md, cohensD: d, ci95: [md - tcrit * seDiff, md + tcrit * seDiff],
  };
}

export function pairedTTest(x: number[], y: number[]): TTestResult {
  const n = Math.min(x.length, y.length);
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) diffs.push(x[i] - y[i]);
  const md = mean(diffs), sdd = sd(diffs);
  const se = sdd / Math.sqrt(n);
  const t = md / se, df = n - 1;
  const p = tTwoTailedP(t, df);
  const d = md / sdd; // Cohen's d for paired (dz)
  const tcrit = tCritical(0.05, df);
  return {
    kind: 'paired', m1: mean(x), m2: mean(y), sd1: sd(x), sd2: sd(y), n1: n, n2: n,
    t, df, p, meanDiff: md, cohensD: d, ci95: [md - tcrit * se, md + tcrit * se],
  };
}

// Two-tailed critical t for alpha via bisection on the tail p-value.
export function tCritical(alpha: number, df: number): number {
  let lo = 0, hi = 1000;
  const target = alpha; // two-tailed
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const p = tTwoTailedP(mid, df);
    if (p > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// One-way ANOVA + eta squared + (Bonferroni) post-hoc pairwise comparisons
// ---------------------------------------------------------------------------

export function oneWayAnova(
  dv: string, factor: string, groups: { level: string; values: number[] }[],
): AnovaResult {
  const all = groups.flatMap(g => g.values);
  const grand = mean(all);
  const N = all.length, kG = groups.length;
  let ssB = 0, ssW = 0;
  const summary = groups.map(g => {
    const m = mean(g.values);
    ssB += g.values.length * (m - grand) ** 2;
    for (const v of g.values) ssW += (v - m) ** 2;
    return { level: g.level, n: g.values.length, mean: m, sd: g.values.length > 1 ? sd(g.values) : NaN };
  });
  const dfB = kG - 1, dfW = N - kG;
  const msB = ssB / dfB, msW = ssW / dfW;
  const F = msB / msW;
  const p = fUpperP(F, dfB, dfW);
  const etaSquared = ssB / (ssB + ssW);

  // Bonferroni-corrected pairwise t-tests (transparent stand-in for Tukey HSD).
  const pairs = kG * (kG - 1) / 2;
  const postHoc: { a: string; b: string; meanDiff: number; p: number }[] = [];
  for (let i = 0; i < kG; i++) for (let j = i + 1; j < kG; j++) {
    const gi = groups[i].values, gj = groups[j].values;
    const t = independentTTest(gi, gj, false);
    postHoc.push({ a: groups[i].level, b: groups[j].level, meanDiff: t.m1 - t.m2, p: Math.min(1, t.p * pairs) });
  }
  return { factor, dv, groups: summary, fStat: F, dfBetween: dfB, dfWithin: dfW, p, etaSquared, postHoc };
}

// ---------------------------------------------------------------------------
// Multiple linear regression (OLS via normal equations) + VIF
// ---------------------------------------------------------------------------

function matMul(A: number[][], B: number[][]): number[][] {
  const r = A.length, c = B[0].length, k = B.length;
  const out = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { let s = 0; for (let x = 0; x < k; x++) s += A[i][x] * B[x][j]; out[i][j] = s; }
  return out;
}
function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map(row => row[j]));
}
// Gauss-Jordan inverse.
function invert(M: number[][]): number[][] | null {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...new Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-12) return null;
    [A[col], A[piv]] = [A[piv], A[col]];
    const d = A[col][col];
    for (let j = 0; j < 2 * n; j++) A[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col];
      for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[col][j];
    }
  }
  return A.map(row => row.slice(n));
}

export function regression(
  dvName: string, y: number[], predictorNames: string[], X: number[][], // X: rows of predictor values
): RegressionResult | null {
  const n = y.length, p = predictorNames.length;
  if (n <= p + 1) return null;
  // design matrix with intercept
  const Xd = X.map(row => [1, ...row]);
  const Xt = transpose(Xd);
  const XtX = matMul(Xt, Xd);
  const XtXinv = invert(XtX);
  if (!XtXinv) return null;
  const Xty = matMul(Xt, y.map(v => [v]));
  const beta = matMul(XtXinv, Xty).map(r => r[0]); // [b0, b1, ...]

  const yhat = Xd.map(row => row.reduce((a, b, i) => a + b * beta[i], 0));
  const my = mean(y);
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { ssRes += (y[i] - yhat[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  const r2 = 1 - ssRes / ssTot;
  const dfModel = p, dfResid = n - p - 1;
  const adjR2 = 1 - (1 - r2) * (n - 1) / dfResid;
  const mse = ssRes / dfResid;
  const fStat = (r2 / dfModel) / ((1 - r2) / dfResid);
  const pModel = fUpperP(fStat, dfModel, dfResid);

  // standardised betas: beta_std = b * (sd_x / sd_y)
  const sdy = sd(y);
  const sdX = predictorNames.map((_, j) => sd(X.map(r => r[j])));

  const coefficients = beta.map((b, i) => {
    const se = Math.sqrt(mse * XtXinv[i][i]);
    const t = b / se;
    const pv = tTwoTailedP(t, dfResid);
    if (i === 0) return { term: 'intercept', b, se, beta: NaN, t, p: pv };
    const betaStd = b * (sdX[i - 1] / sdy);
    // VIF from regressing predictor i-1 on the others
    let vif: number | undefined;
    if (p >= 2) {
      const others = predictorNames.map((_, j) => j).filter(j => j !== i - 1);
      const yi = X.map(r => r[i - 1]);
      const Xi = X.map(r => others.map(j => r[j]));
      const sub = regressionR2(yi, Xi);
      if (sub !== null && sub < 1) vif = 1 / (1 - sub);
    }
    return { term: predictorNames[i - 1], b, se, beta: betaStd, t, p: pv, vif };
  });

  return { dv: dvName, predictors: predictorNames, n, r2, adjR2, fStat, dfModel, dfResid, pModel, coefficients };
}

// helper: R² only (for VIF), avoids recursion bloat
function regressionR2(y: number[], X: number[][]): number | null {
  const n = y.length, p = X[0]?.length ?? 0;
  if (n <= p + 1 || p === 0) return null;
  const Xd = X.map(row => [1, ...row]);
  const Xt = transpose(Xd);
  const inv = invert(matMul(Xt, Xd));
  if (!inv) return null;
  const beta = matMul(inv, matMul(Xt, y.map(v => [v]))).map(r => r[0]);
  const yhat = Xd.map(row => row.reduce((a, b, i) => a + b * beta[i], 0));
  const my = mean(y);
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { ssRes += (y[i] - yhat[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  return 1 - ssRes / ssTot;
}

// ---------------------------------------------------------------------------
// Chi-square test of independence + Cramér's V
// ---------------------------------------------------------------------------

export function chiSquare(
  rowVar: string, colVar: string, rowVals: Cell[], colVals: Cell[],
): ChiSquareResult {
  const pairs: [string, string][] = [];
  for (let i = 0; i < rowVals.length; i++) {
    const a = rowVals[i], b = colVals[i];
    if (a === null || a === '' || b === null || b === '') continue;
    pairs.push([String(a), String(b)]);
  }
  const rowLevels = [...new Set(pairs.map(p => p[0]))].sort();
  const colLevels = [...new Set(pairs.map(p => p[1]))].sort();
  const observed = rowLevels.map(() => new Array(colLevels.length).fill(0));
  for (const [a, b] of pairs) observed[rowLevels.indexOf(a)][colLevels.indexOf(b)]++;
  const rowSums = observed.map(r => r.reduce((x, y) => x + y, 0));
  const colSums = colLevels.map((_, j) => observed.reduce((s, r) => s + r[j], 0));
  const total = pairs.length;
  const expected = rowLevels.map((_, i) => colLevels.map((_, j) => (rowSums[i] * colSums[j]) / total));
  let chi2 = 0;
  for (let i = 0; i < rowLevels.length; i++) for (let j = 0; j < colLevels.length; j++) {
    const e = expected[i][j];
    if (e > 0) chi2 += (observed[i][j] - e) ** 2 / e;
  }
  const df = (rowLevels.length - 1) * (colLevels.length - 1);
  const p = chiSqUpperP(chi2, df);
  const cramersV = Math.sqrt(chi2 / (total * Math.min(rowLevels.length - 1, colLevels.length - 1)));
  return { rowVar, colVar, observed, expected, rowLevels, colLevels, chi2, df, p, cramersV };
}

// ---------------------------------------------------------------------------
// Factor analysis — PCA + EFA (principal-axis factoring) + varimax rotation
// ---------------------------------------------------------------------------
// Built on a Jacobi eigendecomposition of the correlation matrix. KMO + Bartlett
// for sampling adequacy. Faithful to the SPSS "Factor Analysis" workflow.

// Jacobi method for the eigenvalues and eigenvectors of a symmetric matrix.
// Returns eigenvalues + eigenvectors as columns (in original order).
function jacobi(A0: number[][]): { values: number[]; vectors: number[][] } {
  const n = A0.length;
  const a = A0.map(row => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const MAX_SWEEPS = 100;
  for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) off += Math.abs(a[p][q]);
    if (off < 1e-12) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-14) continue;
      const app = a[p][p], aqq = a[q][q];
      const theta = (aqq - app) / (2 * apq);
      const t = theta >= 0 ? 1 / (theta + Math.sqrt(1 + theta * theta)) : 1 / (theta - Math.sqrt(1 + theta * theta));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      a[p][p] = app - t * apq;
      a[q][q] = aqq + t * apq;
      a[p][q] = a[q][p] = 0;
      for (let r = 0; r < n; r++) {
        if (r !== p && r !== q) {
          const arp = a[r][p], arq = a[r][q];
          a[r][p] = a[p][r] = c * arp - s * arq;
          a[r][q] = a[q][r] = s * arp + c * arq;
        }
        const vrp = v[r][p], vrq = v[r][q];
        v[r][p] = c * vrp - s * vrq;
        v[r][q] = s * vrp + c * vrq;
      }
    }
  }
  const values = a.map((row, i) => row[i]);
  return { values, vectors: v };
}

function correlationMatrixDense(M: number[][]): number[][] {
  const n = M.length, k = M[0].length;
  const means: number[] = [];
  const sds: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = M.map(r => r[j]);
    means.push(mean(col));
    sds.push(sd(col));
  }
  const R = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let a = 0; a < k; a++) for (let b = a; b < k; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += ((M[i][a] - means[a]) / sds[a]) * ((M[i][b] - means[b]) / sds[b]);
    const r = s / (n - 1);
    R[a][b] = R[b][a] = a === b ? 1 : r;
  }
  return R;
}

// Kaiser-Meyer-Olkin from the anti-image (partial) correlation matrix.
function kmo(R: number[][]): number {
  const inv = invert(R);
  if (!inv) return NaN;
  const k = R.length;
  let sumR2 = 0, sumP2 = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (i !== j) {
    sumR2 += R[i][j] * R[i][j];
    const pij = -inv[i][j] / Math.sqrt(inv[i][i] * inv[j][j]);
    sumP2 += pij * pij;
  }
  return sumR2 / (sumR2 + sumP2);
}

// Bartlett's test of sphericity.
function bartlett(R: number[][], n: number): { chi2: number; df: number; p: number } {
  const k = R.length;
  const det = matDet(R);
  if (!Number.isFinite(det) || det <= 0) return { chi2: NaN, df: NaN, p: NaN };
  const chi2 = -(n - 1 - (2 * k + 5) / 6) * Math.log(det);
  const df = (k * (k - 1)) / 2;
  return { chi2, df, p: chiSqUpperP(chi2, df) };
}

// Determinant via LU-ish row reduction.
function matDet(M: number[][]): number {
  const n = M.length;
  const a = M.map(r => [...r]);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (Math.abs(a[piv][i]) < 1e-14) return 0;
    if (piv !== i) { [a[i], a[piv]] = [a[piv], a[i]]; det = -det; }
    det *= a[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = a[r][i] / a[i][i];
      for (let c = i; c < n; c++) a[r][c] -= f * a[i][c];
    }
  }
  return det;
}

// Varimax rotation of a loading matrix (items × factors). Returns rotated loadings.
function varimax(L0: number[][], gamma = 1, maxIter = 100, tol = 1e-8): number[][] {
  const p = L0.length, k = L0[0].length;
  if (k < 2) return L0.map(r => [...r]);
  let L = L0.map(r => [...r]);
  let dOld = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let d = 0;
    for (let q = 0; q < k - 1; q++) for (let r = q + 1; r < k; r++) {
      let A = 0, B = 0, C = 0, D = 0;
      for (let i = 0; i < p; i++) {
        const x = L[i][q], y = L[i][r];
        const u = x * x - y * y, v2 = 2 * x * y;
        A += u; B += v2; C += u * u - v2 * v2; D += 2 * u * v2;
      }
      const num = D - (2 * gamma * A * B) / p;
      const den = C - (gamma * (A * A - B * B)) / p;
      const phi = Math.atan2(num, den) / 4;
      if (Math.abs(phi) < 1e-10) continue;
      const c = Math.cos(phi), s = Math.sin(phi);
      for (let i = 0; i < p; i++) {
        const x = L[i][q], y = L[i][r];
        L[i][q] = c * x + s * y;
        L[i][r] = -s * x + c * y;
      }
      d += Math.abs(phi);
    }
    if (Math.abs(d - dOld) < tol) break;
    dOld = d;
  }
  return L;
}

export function factorAnalysis(
  cols: Record<string, Cell[]>, items: string[],
  opts: { method?: 'pca' | 'efa'; nFactors?: number; rotation?: 'none' | 'varimax' } = {},
): FactorAnalysisResult | null {
  const method = opts.method ?? 'pca';
  const rotation = opts.rotation ?? 'varimax';
  const M = completeMatrix(cols, items);
  const n = M.length, k = items.length;
  if (n < k + 5) return null;

  const R = correlationMatrixDense(M);
  const kmoVal = kmo(R);
  const bart = bartlett(R, n);

  // PAF iterates communalities; PCA uses R as-is (diagonals = 1).
  let Rcurr = R.map(r => [...r]);
  let communalities = new Array(k).fill(1);
  if (method === 'efa') {
    // Initial communalities: 1 - 1/diag(R⁻¹) (SMC)
    const inv = invert(R);
    if (inv) for (let i = 0; i < k; i++) communalities[i] = Math.max(0, 1 - 1 / inv[i][i]);
    for (let iter = 0; iter < 25; iter++) {
      for (let i = 0; i < k; i++) Rcurr[i][i] = communalities[i];
      const { values, vectors } = jacobi(Rcurr);
      const order = values.map((v, i) => [v, i] as [number, number]).sort((a, b) => b[0] - a[0]);
      const nFac = opts.nFactors ?? Math.max(1, order.filter(([v]) => v >= 1).length);
      const newCom = new Array(k).fill(0);
      for (let i = 0; i < k; i++) {
        for (let f = 0; f < nFac; f++) {
          const idx = order[f][1];
          const lam = Math.sqrt(Math.max(0, order[f][0]));
          const load = vectors[i][idx] * lam;
          newCom[i] += load * load;
        }
      }
      let delta = 0;
      for (let i = 0; i < k; i++) { delta += Math.abs(newCom[i] - communalities[i]); communalities[i] = Math.min(1, newCom[i]); }
      if (delta < 1e-5) break;
    }
    for (let i = 0; i < k; i++) Rcurr[i][i] = communalities[i];
  }

  const { values, vectors } = jacobi(Rcurr);
  const order = values.map((v, i) => [v, i] as [number, number]).sort((a, b) => b[0] - a[0]);
  const eigenvalues = order.map(([v]) => v);
  const totalVar = method === 'efa' ? communalities.reduce((a, b) => a + b, 0) : k;
  const varianceExplained = eigenvalues.map(v => v / totalVar);
  const cumulativeVariance = varianceExplained.reduce((acc: number[], v, i) => { acc.push(i === 0 ? v : acc[i - 1] + v); return acc; }, []);

  const nFactors = opts.nFactors ?? Math.max(1, eigenvalues.filter(v => v >= 1).length);
  let loadings = Array.from({ length: k }, () => new Array(nFactors).fill(0));
  for (let i = 0; i < k; i++) for (let f = 0; f < nFactors; f++) {
    const idx = order[f][1];
    const lam = Math.sqrt(Math.max(0, eigenvalues[f]));
    loadings[i][f] = vectors[i][idx] * lam;
  }
  if (rotation === 'varimax' && nFactors >= 2) loadings = varimax(loadings);

  const com = loadings.map(row => row.reduce((a, b) => a + b * b, 0));

  return {
    method, items, n, k,
    kmo: kmoVal,
    bartlettChi2: bart.chi2, bartlettDf: bart.df, bartlettP: bart.p,
    eigenvalues, varianceExplained, cumulativeVariance,
    nFactors, rotation, loadings,
    communalities: method === 'efa' ? communalities : com,
  };
}

// ---------------------------------------------------------------------------
// Nonparametric tests — Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis
// ---------------------------------------------------------------------------

function rankWithTies(xs: number[]): { ranks: number[]; tieCorrection: number } {
  const idx = xs.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(xs.length).fill(0);
  let i = 0, tieCorrection = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    const t = j - i + 1;
    if (t > 1) tieCorrection += t ** 3 - t;
    for (let m = i; m <= j; m++) ranks[idx[m][1]] = avg;
    i = j + 1;
  }
  return { ranks, tieCorrection };
}

export function mannWhitney(g1: number[], g2: number[], labels: [string, string] = ['Group 1', 'Group 2']): MannWhitneyResult {
  const n1 = g1.length, n2 = g2.length;
  const all = [...g1, ...g2];
  const { ranks, tieCorrection } = rankWithTies(all);
  const r1 = ranks.slice(0, n1).reduce((a, b) => a + b, 0);
  const r2 = ranks.slice(n1).reduce((a, b) => a + b, 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = r2 - (n2 * (n2 + 1)) / 2;
  const u = Math.min(u1, u2);
  const w = r1;
  const N = n1 + n2;
  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt(((n1 * n2) / 12) * ((N + 1) - tieCorrection / (N * (N - 1))));
  const z = sigmaU > 0 ? (u - muU) / sigmaU : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    kind: 'mann-whitney', groups: labels, n1, n2, u, w, z, p,
    meanRank1: r1 / n1, meanRank2: r2 / n2,
    rankBiserial: 1 - (2 * u) / (n1 * n2),
  };
}

export function wilcoxonSignedRank(x: number[], y: number[], labels: [string, string] = ['Measure 1', 'Measure 2']): WilcoxonResult {
  const diffs: number[] = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i] - y[i];
    if (d !== 0) diffs.push(d);
  }
  const n = diffs.length;
  const abs = diffs.map(d => Math.abs(d));
  const { ranks, tieCorrection } = rankWithTies(abs);
  let wPlus = 0, wMinus = 0;
  for (let i = 0; i < n; i++) (diffs[i] > 0 ? (wPlus += ranks[i]) : (wMinus += ranks[i]));
  const w = Math.min(wPlus, wMinus);
  const mu = (n * (n + 1)) / 4;
  const sigma = Math.sqrt(((n * (n + 1) * (2 * n + 1)) - tieCorrection / 2) / 24);
  const z = sigma > 0 ? (w - mu) / sigma : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    kind: 'wilcoxon-signed-rank', vars: labels, n, w, z, p,
    matchedR: n > 0 ? z / Math.sqrt(n) : NaN,
  };
}

export function kruskalWallis(dv: string, factor: string, groups: { level: string; values: number[] }[]): KruskalWallisResult {
  const all: number[] = [];
  const idx: number[] = []; // group index per observation
  groups.forEach((g, i) => g.values.forEach(v => { all.push(v); idx.push(i); }));
  const N = all.length, kG = groups.length;
  const { ranks, tieCorrection } = rankWithTies(all);
  const sumRanks = new Array(kG).fill(0);
  const counts = new Array(kG).fill(0);
  for (let i = 0; i < N; i++) { sumRanks[idx[i]] += ranks[i]; counts[idx[i]]++; }
  let H = 0;
  for (let g = 0; g < kG; g++) H += (sumRanks[g] * sumRanks[g]) / counts[g];
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const tieAdj = 1 - tieCorrection / (N ** 3 - N);
  if (tieAdj > 0) H /= tieAdj;
  const df = kG - 1;
  const p = chiSqUpperP(H, df);
  const epsilonSquared = H / ((N * N - 1) / (N + 1));
  return {
    kind: 'kruskal-wallis', factor, dv,
    groups: groups.map((g, i) => ({ level: g.level, n: counts[i], meanRank: sumRanks[i] / counts[i] })),
    h: H, df, p, epsilonSquared,
  };
}

// ---------------------------------------------------------------------------
// Mediation (PROCESS Model 4) + Moderation (Model 1)
// ---------------------------------------------------------------------------
// Implements simple, single-mediator and single-moderator linear models the way
// Hayes' PROCESS macro presents them in papers. Mediation uses percentile
// bootstrap (default 5000 resamples) for the CI of the indirect effect.

function simpleOLS(y: number[], xs: number[][]): { b: number[]; se: number[]; pVals: number[]; r2: number; resid: number[] } | null {
  const r = regression('_', y, xs[0].map((_, j) => `x${j}`), xs);
  if (!r) return null;
  const b = r.coefficients.map(c => c.b);
  const se = r.coefficients.map(c => c.se);
  const pVals = r.coefficients.map(c => c.p);
  const yhat = xs.map(row => b[0] + row.reduce((a, v, i) => a + v * b[i + 1], 0));
  const resid = y.map((v, i) => v - yhat[i]);
  return { b, se, pVals, r2: r.r2, resid };
}

export function mediation(xN: string, mN: string, yN: string, x: number[], m: number[], y: number[], bootstrapN = 5000): MediationResult | null {
  const n = x.length;
  if (n < 10) return null;
  const xm = simpleOLS(m, x.map(v => [v]));                       // M = a0 + aX
  const xmy = simpleOLS(y, x.map((v, i) => [v, m[i]]));            // Y = b0 + c'X + bM
  const xy = simpleOLS(y, x.map(v => [v]));                       // Y = b0 + cX
  if (!xm || !xmy || !xy) return null;
  const a = xm.b[1], aSE = xm.se[1], aP = xm.pVals[1];
  const cPrime = xmy.b[1], cPrimeSE = xmy.se[1], cPrimeP = xmy.pVals[1];
  const b = xmy.b[2], bSE = xmy.se[2], bP = xmy.pVals[2];
  const c = xy.b[1], cSE = xy.se[1], cP = xy.pVals[1];
  const indirect = a * b;
  const sobelSE = Math.sqrt(b * b * aSE * aSE + a * a * bSE * bSE);
  const sobelZ = sobelSE > 0 ? indirect / sobelSE : 0;
  const sobelP = 2 * (1 - normalCdf(Math.abs(sobelZ)));

  // Percentile bootstrap.
  const boots: number[] = [];
  const seed = 0xC0FFEE; let rng = seed;
  const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 0x100000000; };
  for (let i = 0; i < bootstrapN; i++) {
    const bx: number[] = [], bm: number[] = [], by: number[] = [];
    for (let j = 0; j < n; j++) { const k = Math.floor(rand() * n); bx.push(x[k]); bm.push(m[k]); by.push(y[k]); }
    const fitA = simpleOLS(bm, bx.map(v => [v]));
    const fitB = simpleOLS(by, bx.map((v, idx) => [v, bm[idx]]));
    if (fitA && fitB) boots.push(fitA.b[1] * fitB.b[2]);
  }
  boots.sort((p1, p2) => p1 - p2);
  const lo = boots[Math.floor(0.025 * boots.length)] ?? NaN;
  const hi = boots[Math.floor(0.975 * boots.length)] ?? NaN;

  return {
    x: xN, m: mN, y: yN, n,
    a, aSE, aP, b, bSE, bP, cPrime, cPrimeSE, cPrimeP, c, cSE, cP,
    indirect, sobelZ, sobelP, bootstrapCI95: [lo, hi], bootstrapN,
  };
}

export function moderation(xN: string, wN: string, yN: string, x: number[], w: number[], y: number[]): ModerationResult | null {
  const n = x.length;
  if (n < 10) return null;
  const mx = mean(x), mw = mean(w);
  const xc = x.map(v => v - mx);
  const wc = w.map(v => v - mw);
  const xw = xc.map((v, i) => v * wc[i]);
  // Step 1: main effects only (for ΔR²).
  const main = regression(yN, y, [xN, wN], xc.map((v, i) => [v, wc[i]]));
  // Step 2: add interaction term.
  const full = regression(yN, y, [xN, wN, `${xN} × ${wN}`], xc.map((v, i) => [v, wc[i], xw[i]]));
  if (!main || !full) return null;
  const sw = sd(w);
  const lowW = -sw, hiW = sw;
  const bX = full.coefficients[1].b, bW = full.coefficients[2].b, bXW = full.coefficients[3].b;
  const seXW = full.coefficients[3].se;
  // Simple slopes of Y on X at low/mean/high W: slope = bX + bXW * (Wc).
  const slope = (wcVal: number) => bX + bXW * wcVal;
  // SE of the simple slope from the variance-covariance matrix would be ideal; here we use
  // the delta approximation: var(slope) = var(bX) + Wc² var(bXW) + 2 Wc cov(bX, bXW).
  // Without the full covariance, we conservatively approximate using SE(bX) and SE(bXW).
  const seX = full.coefficients[1].se;
  const seSlope = (wcVal: number) => Math.sqrt(seX * seX + wcVal * wcVal * seXW * seXW);
  const slopeLine = (wcVal: number, label: string) => {
    const s = slope(wcVal), se = seSlope(wcVal);
    const t = se > 0 ? s / se : 0;
    return { wLevel: label, w: mw + wcVal, slope: s, se, t, p: tTwoTailedP(t, n - 4) };
  };
  return {
    x: xN, w: wN, y: yN, n,
    bX, seX, pX: full.coefficients[1].p,
    bW, seW: full.coefficients[2].se, pW: full.coefficients[2].p,
    bXW, seXW, pXW: full.coefficients[3].p,
    intercept: full.coefficients[0].b,
    r2: full.r2, r2Change: full.r2 - main.r2,
    simpleSlopes: [slopeLine(lowW, '−1 SD'), slopeLine(0, 'Mean'), slopeLine(hiW, '+1 SD')],
  };
}

// shared formatting helpers
export function fmt(x: number, d = 2): string {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(d);
}
export function pStars(p: number): string {
  if (!Number.isFinite(p)) return '';
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return '';
}
export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '—';
  return p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, '');
}

// ── Meta-analysis (inverse-variance fixed + DerSimonian–Laird random) ──
// Pools per-study effect sizes (yi) with their variances (vi = SE²). Fixed
// effect = inverse-variance weighting; random effect adds the DL between-
// study variance τ². Heterogeneity via Cochran's Q (χ² on k−1 df) and I².
// All standard textbook formulas (Borenstein et al., 2009). Verified.
export interface MetaStudy { label: string; yi: number; vi: number }
export interface MetaPooled { estimate: number; se: number; ciLow: number; ciHigh: number; z: number; p: number }
export interface MetaResult {
  k: number;
  fixed: MetaPooled;
  random: MetaPooled;
  Q: number; dfQ: number; Qp: number; I2: number; tau2: number;
  weights: { label: string; yi: number; vi: number; wFixedPct: number; wRandomPct: number }[];
}

export function metaAnalysis(studies: MetaStudy[]): MetaResult {
  const k = studies.length;
  const Z = 1.959963985; // 95% normal critical value
  const wF = studies.map(s => 1 / s.vi);
  const sumWF = wF.reduce((a, b) => a + b, 0);
  const fixedEst = studies.reduce((a, s, i) => a + wF[i] * s.yi, 0) / sumWF;
  const fixedSE = Math.sqrt(1 / sumWF);

  const Q = studies.reduce((a, s, i) => a + wF[i] * (s.yi - fixedEst) ** 2, 0);
  const dfQ = k - 1;
  const sumWF2 = wF.reduce((a, w) => a + w * w, 0);
  const C = sumWF - sumWF2 / sumWF;
  const tau2 = (dfQ > 0 && C > 0) ? Math.max(0, (Q - dfQ) / C) : 0;
  const I2 = Q > dfQ ? Math.max(0, ((Q - dfQ) / Q) * 100) : 0;
  const Qp = dfQ > 0 ? chiSqUpperP(Q, dfQ) : 1;

  const wR = studies.map(s => 1 / (s.vi + tau2));
  const sumWR = wR.reduce((a, b) => a + b, 0);
  const randomEst = studies.reduce((a, s, i) => a + wR[i] * s.yi, 0) / sumWR;
  const randomSE = Math.sqrt(1 / sumWR);

  const pooled = (est: number, se: number): MetaPooled => {
    const z = est / se;
    return { estimate: est, se, ciLow: est - Z * se, ciHigh: est + Z * se, z, p: 2 * (1 - normalCdf(Math.abs(z))) };
  };
  return {
    k, fixed: pooled(fixedEst, fixedSE), random: pooled(randomEst, randomSE),
    Q, dfQ, Qp, I2, tau2,
    weights: studies.map((s, i) => ({
      label: s.label, yi: s.yi, vi: s.vi,
      wFixedPct: (wF[i] / sumWF) * 100, wRandomPct: (wR[i] / sumWR) * 100,
    })),
  };
}

// ── Power analysis (two-sample t-test, normal approximation) ──────────
// Acklam's inverse-normal (qnorm) + the standard normal-approximation
// formulas for a two-group comparison. Close to exact (noncentral-t /
// G*Power) for n ≳ 20 and very slightly conservative; the UI labels it as
// an approximation. Formulas: Cohen (1988).
export function qnorm(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Achieved power for a two-sample (independent) t-test, two-tailed.
export function tTestPowerTwoSample(d: number, nPerGroup: number, alpha = 0.05): number {
  if (nPerGroup < 2 || d <= 0) return NaN;
  const zCrit = qnorm(1 - alpha / 2);
  const ncp = d * Math.sqrt(nPerGroup / 2);
  return Math.min(1, normalCdf(ncp - zCrit) + normalCdf(-ncp - zCrit));
}

// Required n PER GROUP for a target power, two-sample t-test, two-tailed.
export function tTestRequiredN(d: number, power = 0.8, alpha = 0.05): number {
  if (d <= 0) return Infinity;
  const z = qnorm(1 - alpha / 2) + qnorm(power);
  return Math.ceil(2 * (z * z) / (d * d));
}

// ── Congeneric reliability & convergent validity (CFA-style) ──────────
// For a set of items hypothesised to measure ONE construct, takes the
// single-factor (unrotated) standardized loadings and reports McDonald's ω
// (= composite reliability, CR) and Average Variance Extracted (AVE):
//   ω = CR = (Σλ)² / [ (Σλ)² + Σ(1−λ²) ]      AVE = mean(λ²)
// This is the practically-useful core of a confirmatory measurement model
// (ω/CR ≥ .70 acceptable; AVE ≥ .50 convergent validity) — NOT a full SEM
// with fit indices. Loadings come from the (textbook-verified) factor
// routine. Standard formulas: McDonald (1999); Fornell & Larcker (1981).
export interface CongenericResult {
  k: number;
  loadings: { item: string; loading: number }[];
  omega: number;   // McDonald's ω total (= composite reliability, CR)
  ave: number;     // average variance extracted
}

export function congenericReliability(cols: Record<string, Cell[]>, items: string[]): CongenericResult | null {
  if (items.length < 3) return null;
  const fa = factorAnalysis(cols, items, { method: 'pca', nFactors: 1, rotation: 'none' });
  if (!fa) return null;
  let load = items.map((_, i) => fa.loadings[i][0]);
  // The sign of a factor is arbitrary; align so the construct is the positive
  // direction (a genuinely reverse-keyed item then shows a negative loading).
  const sum = load.reduce((a, b) => a + b, 0);
  if (sum < 0) load = load.map(x => -x);
  const sumL = load.reduce((a, b) => a + b, 0);
  const sumUniq = load.reduce((a, l) => a + (1 - l * l), 0);
  const sumL2 = load.reduce((a, l) => a + l * l, 0);
  const omega = (sumL * sumL) / (sumL * sumL + sumUniq);
  const ave = sumL2 / items.length;
  return {
    k: items.length,
    loadings: items.map((item, i) => ({ item, loading: load[i] })),
    omega, ave,
  };
}

// ---------------------------------------------------------------------------
// F-distribution quantile (inverse CDF) — bisection on the upper tail.
// Used for ICC confidence intervals. Returns x s.t. P(F_{d1,d2} ≤ x) = p.
// ---------------------------------------------------------------------------
export function fQuantile(p: number, d1: number, d2: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  // target upper-tail probability
  const targetUpper = 1 - p;
  let lo = 0, hi = 1e6;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    const u = fUpperP(mid, d1, d2);
    if (u > targetUpper) lo = mid; else hi = mid;     // larger x → smaller upper tail
    if (hi - lo < 1e-9 * (1 + lo)) break;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Factorial (two-way) ANOVA — Type III sums of squares via a GLM with effect
// (sum-to-zero) coding. Type III is computed as SSE(reduced) − SSE(full), where
// the reduced model drops only the columns for the effect being tested. This
// matches SPSS/R `car::Anova(type=3)` and is correct for UNBALANCED designs
// (where simple SS decomposition would be wrong). Verified against a balanced
// 2×2 textbook case and an unbalanced case (see stats.verify.mjs).
// ---------------------------------------------------------------------------
export function twoWayAnova(
  dv: string, factorA: string, factorB: string,
  rows: { a: string; b: string; y: number }[],
): TwoWayAnovaResult | null {
  if (rows.length < 4) return null;
  const levelsA = [...new Set(rows.map(r => r.a))].sort();
  const levelsB = [...new Set(rows.map(r => r.b))].sort();
  const A = levelsA.length, B = levelsB.length;
  if (A < 2 || B < 2) return null;
  const N = rows.length;
  const dfResid = N - A * B;
  if (dfResid < 1) return null;                       // need replication within cells

  const ai = rows.map(r => levelsA.indexOf(r.a));
  const bi = rows.map(r => levelsB.indexOf(r.b));
  const y = rows.map(r => r.y);

  // sum-to-zero effect-coding columns
  const code = (idx: number[], L: number): number[][] =>
    Array.from({ length: L - 1 }, (_, k) => idx.map(j => (j === k ? 1 : j === L - 1 ? -1 : 0)));
  const aCols = code(ai, A);                          // A-1 columns
  const bCols = code(bi, B);                          // B-1 columns
  const abCols: number[][] = [];                      // (A-1)(B-1) interaction columns
  for (const ca of aCols) for (const cb of bCols) abCols.push(ca.map((v, r) => v * cb[r]));

  // OLS residual SS for a model whose design is [1, ...columns]
  const sseOf = (columns: number[][]): number => {
    const Xd = y.map((_, r) => [1, ...columns.map(c => c[r])]);
    const Xt = transpose(Xd);
    const inv = invert(matMul(Xt, Xd));
    if (!inv) return NaN;
    const beta = matMul(inv, matMul(Xt, y.map(v => [v]))).map(rr => rr[0]);
    let sse = 0;
    for (let r = 0; r < N; r++) {
      const fit = Xd[r].reduce((s, x, i) => s + x * beta[i], 0);
      sse += (y[r] - fit) ** 2;
    }
    return sse;
  };

  const full = [...aCols, ...bCols, ...abCols];
  const sseFull = sseOf(full);
  const msResid = sseFull / dfResid;

  const ssA = sseOf([...bCols, ...abCols]) - sseFull;
  const ssB = sseOf([...aCols, ...abCols]) - sseFull;
  const ssAB = sseOf([...aCols, ...bCols]) - sseFull;

  const mkEffect = (name: string, ss: number, df: number) => {
    const ms = ss / df;
    const F = ms / msResid;
    return { name, df, ss, ms, F, p: fUpperP(F, df, dfResid), partialEtaSq: ss / (ss + sseFull) };
  };

  // cell descriptives
  const cellMap = new Map<string, number[]>();
  rows.forEach(r => { const k = `${r.a} ${r.b}`; (cellMap.get(k) ?? cellMap.set(k, []).get(k)!).push(r.y); });
  const cells: TwoWayAnovaResult['cells'] = [];
  const counts: number[] = [];
  for (const a of levelsA) for (const b of levelsB) {
    const vals = cellMap.get(`${a} ${b}`) ?? [];
    counts.push(vals.length);
    cells.push({ a, b, n: vals.length, mean: vals.length ? mean(vals) : NaN, sd: vals.length > 1 ? sd(vals) : NaN });
  }
  const balanced = counts.every(c => c === counts[0]);

  return {
    kind: 'two-way-anova', dv, factorA, factorB, levelsA, levelsB, n: N, cells,
    effects: [
      mkEffect(factorA, ssA, A - 1),
      mkEffect(factorB, ssB, B - 1),
      mkEffect(`${factorA} × ${factorB}`, ssAB, (A - 1) * (B - 1)),
    ],
    dfResidual: dfResid, ssResidual: sseFull, msResidual: msResid, balanced,
  };
}

// ---------------------------------------------------------------------------
// One-way repeated-measures ANOVA (within-subjects). `wide` is subjects × k
// conditions; rows with any missing value are dropped listwise. Partitions
// SS_total into conditions, subjects, and error. Verified against textbook
// (Field, 2018) values.
// ---------------------------------------------------------------------------
export function repeatedMeasuresAnova(
  conditions: string[], wide: number[][],
): RepeatedMeasuresResult | null {
  const k = conditions.length;
  if (k < 2) return null;
  const data = wide.filter(row => row.length === k && row.every(Number.isFinite));
  const n = data.length;
  if (n < 2) return null;

  const grand = mean(data.flat());
  const condMean = conditions.map((_, j) => mean(data.map(r => r[j])));
  const condSd = conditions.map((_, j) => sd(data.map(r => r[j])));
  const subjMean = data.map(r => mean(r));

  let ssTotal = 0, ssCond = 0, ssSubj = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) ssTotal += (data[i][j] - grand) ** 2;
  for (let j = 0; j < k; j++) ssCond += n * (condMean[j] - grand) ** 2;
  for (let i = 0; i < n; i++) ssSubj += k * (subjMean[i] - grand) ** 2;
  const ssError = ssTotal - ssCond - ssSubj;

  const dfCond = k - 1, dfSubj = n - 1, dfError = (k - 1) * (n - 1);
  const msCond = ssCond / dfCond, msError = ssError / dfError;
  const F = msCond / msError;
  return {
    kind: 'repeated-measures-anova', conditions, n, k,
    means: conditions.map((c, j) => ({ condition: c, mean: condMean[j], sd: condSd[j] })),
    ssConditions: ssCond, dfConditions: dfCond, msConditions: msCond,
    ssSubjects: ssSubj, dfSubjects: dfSubj,
    ssError, dfError, msError,
    F, p: fUpperP(F, dfCond, dfError),
    partialEtaSq: ssCond / (ssCond + ssError),
  };
}

// ---------------------------------------------------------------------------
// Intraclass correlation (ICC). `wide` is targets (n) × raters/measures (k),
// listwise-complete. Reports the four most-used forms (Shrout & Fleiss, 1979;
// McGraw & Wong, 1996): two-way random absolute-agreement ICC(2,1)/ICC(2,k) and
// two-way mixed consistency ICC(3,1)/ICC(3,k), each with a 95% CI. Verified
// against the canonical Shrout & Fleiss (1979) 6×4 example.
// ---------------------------------------------------------------------------
export function icc(wide: number[][]): IccResult | null {
  const data = wide.filter(r => r.every(Number.isFinite));
  const n = data.length;
  if (n < 2) return null;
  const k = data[0].length;
  if (k < 2 || !data.every(r => r.length === k)) return null;

  const grand = mean(data.flat());
  const rowMean = data.map(r => mean(r));
  const colMean = Array.from({ length: k }, (_, j) => mean(data.map(r => r[j])));

  let ssTotal = 0, ssRow = 0, ssCol = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) ssTotal += (data[i][j] - grand) ** 2;
  for (let i = 0; i < n; i++) ssRow += k * (rowMean[i] - grand) ** 2;
  for (let j = 0; j < k; j++) ssCol += n * (colMean[j] - grand) ** 2;
  const ssErr = ssTotal - ssRow - ssCol;

  const msR = ssRow / (n - 1);
  const msC = ssCol / (k - 1);
  const msE = ssErr / ((n - 1) * (k - 1));
  const msW = (ssTotal - ssRow) / (n * (k - 1));     // one-way within (for reference)

  const alpha = 0.05;
  // consistency single ICC(3,1) point + CI (exact, F-based)
  const icc31 = (msR - msE) / (msR + (k - 1) * msE);
  const fC = msR / msE;
  const flC = fC / fQuantile(1 - alpha / 2, n - 1, (n - 1) * (k - 1));
  const fuC = fC * fQuantile(1 - alpha / 2, (n - 1) * (k - 1), n - 1);
  const ci31: [number, number] = [(flC - 1) / (flC + k - 1), (fuC - 1) / (fuC + k - 1)];
  const icc3k = (msR - msE) / msR;
  const ci3k: [number, number] = [1 - 1 / flC, 1 - 1 / fuC];

  // absolute-agreement ICC(2,1) point + CI (McGraw & Wong, 1996, eq. 18–21)
  const icc21 = (msR - msE) / (msR + (k - 1) * msE + (k / n) * (msC - msE));
  const a21 = (k * icc21) / (n * (1 - icc21));
  const b21 = 1 + (k * icc21 * (n - 1)) / (n * (1 - icc21));
  const v = (a21 * msC + b21 * msE) ** 2 /
    ((a21 * msC) ** 2 / (k - 1) + (b21 * msE) ** 2 / ((n - 1) * (k - 1)));
  const f1 = fQuantile(1 - alpha / 2, n - 1, v);
  const f2 = fQuantile(1 - alpha / 2, v, n - 1);
  const lo21 = (n * (msR - f1 * msE)) / (f1 * (k * msC + (k * n - k - n) * msE) + n * msR);
  const up21 = (n * (f2 * msR - msE)) / (k * msC + (k * n - k - n) * msE + n * f2 * msR);
  const ci21: [number, number] = [lo21, up21];
  // average-of-k agreement ICC(2,k)
  const icc2k = (msR - msE) / (msR + (msC - msE) / n);
  const ci2k: [number, number] = [lo21 * k / (1 + (k - 1) * lo21), up21 * k / (1 + (k - 1) * up21)];

  const clamp = (x: number): number => Math.max(-1, Math.min(1, x));
  const cl = (c: [number, number]): [number, number] => [clamp(c[0]), clamp(c[1])];
  return {
    kind: 'icc', n, k, msR, msC, msE, msW,
    estimates: [
      { type: 'ICC(2,1)', label: 'Two-way random, absolute agreement, single rater', icc: icc21, ci95: cl(ci21) },
      { type: 'ICC(2,k)', label: `Two-way random, absolute agreement, average of ${k}`, icc: icc2k, ci95: cl(ci2k) },
      { type: 'ICC(3,1)', label: 'Two-way mixed, consistency, single rater', icc: icc31, ci95: cl(ci31) },
      { type: 'ICC(3,k)', label: `Two-way mixed, consistency, average of ${k}`, icc: icc3k, ci95: cl(ci3k) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Binary logistic regression via IRLS (Fisher scoring). Returns ML coefficients
// with Wald SEs/z/p, odds ratios + 95% CIs, log-likelihoods, McFadden pseudo-R²,
// and the overall likelihood-ratio test vs the intercept-only model. Verified
// against the published Wikipedia "hours studied → pass" example
// (β0 ≈ −4.078, β1 ≈ 1.505).
// ---------------------------------------------------------------------------
export function logisticRegression(
  dvName: string, y: number[], predictorNames: string[], X: number[][],
): LogisticRegressionResult | null {
  const n = y.length, p = predictorNames.length;
  if (n <= p + 1) return null;
  if (!y.every(v => v === 0 || v === 1)) return null;
  const events = y.reduce<number>((a, b) => a + b, 0);
  if (events === 0 || events === n) return null;       // no variation in outcome

  const Xd = X.map(row => [1, ...row]);                // n × (p+1) with intercept
  const cols = p + 1;
  let beta = new Array(cols).fill(0);
  const ll = (b: number[]): number => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const eta = Xd[i].reduce((a, x, j) => a + x * b[j], 0);
      // log(1+e^eta) computed stably
      const log1pe = eta > 30 ? eta : Math.log1p(Math.exp(eta));
      s += y[i] * eta - log1pe;
    }
    return s;
  };

  let iterations = 0, converged = false;
  let prevLL = -Infinity;
  let XtWXinv: number[][] | null = null;
  for (; iterations < 50; iterations++) {
    const mu = Xd.map(row => { const eta = row.reduce((a, x, j) => a + x * beta[j], 0); return 1 / (1 + Math.exp(-eta)); });
    const w = mu.map(m => Math.max(m * (1 - m), 1e-10));
    // X'WX and X'W z  where working response z = eta + (y-mu)/w
    const XtWX = Array.from({ length: cols }, () => new Array(cols).fill(0));
    const XtWz = new Array(cols).fill(0);
    for (let i = 0; i < n; i++) {
      const eta = Xd[i].reduce((a, x, j) => a + x * beta[j], 0);
      const z = eta + (y[i] - mu[i]) / w[i];
      for (let a = 0; a < cols; a++) {
        XtWz[a] += Xd[i][a] * w[i] * z;
        for (let b = 0; b < cols; b++) XtWX[a][b] += Xd[i][a] * w[i] * Xd[i][b];
      }
    }
    const inv = invert(XtWX);
    if (!inv) return null;
    XtWXinv = inv;
    beta = matMul(inv, XtWz.map(v => [v])).map(r => r[0]);
    const cur = ll(beta);
    if (Math.abs(cur - prevLL) < 1e-8) { converged = true; iterations++; break; }
    prevLL = cur;
  }
  if (!XtWXinv) return null;

  const logLik = ll(beta);
  const pBar = events / n;
  const nullLogLik = events * Math.log(pBar) + (n - events) * Math.log(1 - pBar);
  const mcFadden = 1 - logLik / nullLogLik;
  const lrChi2 = 2 * (logLik - nullLogLik);

  const terms = ['intercept', ...predictorNames];
  const coefficients = beta.map((b, i) => {
    const se = Math.sqrt(XtWXinv![i][i]);
    const z = b / se;
    const pv = 2 * (1 - normalCdf(Math.abs(z)));
    return {
      term: terms[i], b, se, z, p: pv,
      oddsRatio: Math.exp(b),
      orCI95: [Math.exp(b - 1.96 * se), Math.exp(b + 1.96 * se)] as [number, number],
    };
  });

  return {
    kind: 'logistic-regression', dv: dvName, predictors: predictorNames, n, events,
    iterations, converged, coefficients,
    logLik, nullLogLik, mcFaddenR2: mcFadden,
    lrChi2, lrDf: p, lrP: chiSqUpperP(lrChi2, p),
  };
}

// ---------------------------------------------------------------------------
// Cohen's kappa — chance-corrected agreement between two raters who assign the
// same targets to nominal categories. κ = (p_o − p_e) / (1 − p_e), where p_o is
// observed agreement and p_e is agreement expected by chance from the marginals.
// SE is the large-sample approximation of Cohen (1960); bands follow Landis &
// Koch (1977). Verified against a hand-computed 2×2 table (κ = 0.40) below.
// ---------------------------------------------------------------------------
export function cohensKappa(
  r1: Cell[], r2: Cell[], name1 = 'Rater 1', name2 = 'Rater 2',
): CohensKappaResult | null {
  const pairs: [string, string][] = [];
  const len = Math.min(r1.length, r2.length);
  for (let i = 0; i < len; i++) {
    const a = r1[i], b = r2[i];
    if (a !== null && a !== '' && b !== null && b !== '') pairs.push([String(a), String(b)]);
  }
  const n = pairs.length;
  if (n < 2) return null;
  const categories = [...new Set(pairs.flatMap(p => p))].sort();
  const K = categories.length;
  if (K < 2) return null;                               // no variation → κ undefined
  const idx = new Map(categories.map((c, i) => [c, i]));
  const matrix = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const [a, b] of pairs) matrix[idx.get(a)!][idx.get(b)!]++;

  const rowT = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const colT = categories.map((_, j) => matrix.reduce((s, row) => s + row[j], 0));
  let agree = 0;
  for (let i = 0; i < K; i++) agree += matrix[i][i];
  const po = agree / n;
  let pe = 0;
  for (let i = 0; i < K; i++) pe += (rowT[i] / n) * (colT[i] / n);

  const kappa = pe >= 1 ? 1 : (po - pe) / (1 - pe);
  const se = pe >= 1 ? 0 : Math.sqrt((po * (1 - po)) / (n * (1 - pe) ** 2));
  const z = se > 0 ? kappa / se : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const ci95: [number, number] = [kappa - 1.96 * se, kappa + 1.96 * se];
  const interpretation =
    kappa < 0 ? 'poor (worse than chance)' :
    kappa < 0.20 ? 'slight' :
    kappa < 0.40 ? 'fair' :
    kappa < 0.60 ? 'moderate' :
    kappa < 0.80 ? 'substantial' : 'almost perfect';

  return { kind: 'cohens-kappa', rater1: name1, rater2: name2, n, categories, matrix, po, pe, kappa, se, ci95, z, p, interpretation };
}

// ---------------------------------------------------------------------------
// Poisson regression for count outcomes via IRLS (Fisher scoring) with a log
// link: log(μ) = Xβ, Var(y) = μ. Returns ML coefficients (log-rate scale) with
// Wald SEs/z/p, incidence-rate ratios exp(β) + 95% CIs, log-likelihoods,
// McFadden pseudo-R², the LR test vs the intercept-only model, and the Pearson
// dispersion statistic (≫ 1 flags overdispersion → negative binomial). Verified
// against the exact intercept-only identity (β₀ = log ȳ) and the MLE score
// equations Xᵀ(y − μ) = 0 (see stats.verify.mjs).
// ---------------------------------------------------------------------------
export function poissonRegression(
  dvName: string, y: number[], predictorNames: string[], X: number[][],
): PoissonRegressionResult | null {
  const n = y.length, p = predictorNames.length;
  if (n <= p + 1) return null;
  if (!y.every(v => Number.isFinite(v) && v >= 0)) return null;     // counts only
  const sumY = y.reduce<number>((a, b) => a + b, 0);
  if (sumY === 0) return null;                                       // no events

  const Xd = X.map(row => [1, ...row]);
  const cols = p + 1;
  const lgam = y.map(v => gammln(v + 1));                            // constant log(y!) terms
  let beta = new Array(cols).fill(0);
  beta[0] = Math.log(sumY / n);                                      // start at log(mean)
  const ll = (b: number[]): number => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const eta = Xd[i].reduce((a, x, j) => a + x * b[j], 0);
      s += y[i] * eta - Math.exp(eta) - lgam[i];
    }
    return s;
  };

  let iterations = 0, converged = false, prevLL = -Infinity;
  let XtWXinv: number[][] | null = null;
  for (; iterations < 50; iterations++) {
    const eta = Xd.map(row => row.reduce((a, x, j) => a + x * beta[j], 0));
    const mu = eta.map(e => Math.exp(e));
    const w = mu.map(m => Math.max(m, 1e-10));
    const XtWX = Array.from({ length: cols }, () => new Array(cols).fill(0));
    const XtWz = new Array(cols).fill(0);
    for (let i = 0; i < n; i++) {
      const z = eta[i] + (y[i] - mu[i]) / w[i];                      // working response
      for (let a = 0; a < cols; a++) {
        XtWz[a] += Xd[i][a] * w[i] * z;
        for (let b = 0; b < cols; b++) XtWX[a][b] += Xd[i][a] * w[i] * Xd[i][b];
      }
    }
    const inv = invert(XtWX);
    if (!inv) return null;
    XtWXinv = inv;
    beta = matMul(inv, XtWz.map(v => [v])).map(r => r[0]);
    const cur = ll(beta);
    if (Math.abs(cur - prevLL) < 1e-9) { converged = true; iterations++; break; }
    prevLL = cur;
  }
  if (!XtWXinv) return null;

  const logLik = ll(beta);
  const muBar = sumY / n;
  let nullLogLik = 0;
  for (let i = 0; i < n; i++) nullLogLik += y[i] * Math.log(muBar) - muBar - lgam[i];
  const mcFadden = nullLogLik === 0 ? 0 : 1 - logLik / nullLogLik;
  const lrChi2 = 2 * (logLik - nullLogLik);

  let pearson = 0;
  for (let i = 0; i < n; i++) {
    const mu = Math.exp(Xd[i].reduce((a, x, j) => a + x * beta[j], 0));
    pearson += (y[i] - mu) ** 2 / mu;
  }
  const dfResid = n - cols;
  const dispersion = dfResid > 0 ? pearson / dfResid : NaN;

  const terms = ['intercept', ...predictorNames];
  const coefficients = beta.map((b, i) => {
    const se = Math.sqrt(XtWXinv![i][i]);
    const z = b / se;
    const pv = 2 * (1 - normalCdf(Math.abs(z)));
    return {
      term: terms[i], b, se, z, p: pv,
      rateRatio: Math.exp(b),
      rrCI95: [Math.exp(b - 1.96 * se), Math.exp(b + 1.96 * se)] as [number, number],
    };
  });

  return {
    kind: 'poisson-regression', dv: dvName, predictors: predictorNames, n, sumY,
    iterations, converged, coefficients,
    logLik, nullLogLik, mcFaddenR2: mcFadden,
    lrChi2, lrDf: p, lrP: p > 0 ? chiSqUpperP(lrChi2, p) : 1,
    dispersion,
  };
}

// ---------------------------------------------------------------------------
// Partial correlation — the Pearson correlation between x and y after the
// linear influence of one or more control variables is removed from both.
// Computed from the inverse of the correlation matrix of [x, y, controls]:
// r_xy·z = −P⁻¹[x,y] / √(P⁻¹[x,x]·P⁻¹[y,y]), tested with t = r√(df/(1−r²)) on
// df = n − 2 − k, with a Fisher-z CI. Verified to equal the one-control closed
// form (r_xy − r_xz r_yz)/√((1−r_xz²)(1−r_yz²)) (see stats.verify.mjs).
// ---------------------------------------------------------------------------
export function partialCorrelation(
  xName: string, yName: string, controlNames: string[],
  x: number[], y: number[], controls: number[][],
): PartialCorrelationResult | null {
  const k = controlNames.length;
  if (k < 1) return null;
  const allCols = [x, y, ...controls];
  const m = allCols.length;
  const len = Math.min(...allCols.map(c => c.length));
  const rows: number[][] = [];
  for (let i = 0; i < len; i++) {
    const row = allCols.map(c => c[i]);
    if (row.every(Number.isFinite)) rows.push(row);
  }
  const n = rows.length;
  if (n < m + 2) return null;

  const col = (j: number) => rows.map(r => r[j]);
  const means = Array.from({ length: m }, (_, j) => mean(col(j)));
  const sds = Array.from({ length: m }, (_, j) => Math.sqrt(variance(col(j))));
  if (sds.some(s => s === 0)) return null;
  const R = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) {
    let s = 0;
    for (const r of rows) s += (r[a] - means[a]) * (r[b] - means[b]);
    R[a][b] = (s / (n - 1)) / (sds[a] * sds[b]);
  }
  const zeroOrderR = R[0][1];
  const Pinv = invert(R);
  if (!Pinv) return null;
  const partialR = -Pinv[0][1] / Math.sqrt(Pinv[0][0] * Pinv[1][1]);

  const df = n - 2 - k;
  if (df < 1) return null;
  const t = partialR * Math.sqrt(df / Math.max(1 - partialR * partialR, 1e-12));
  const p = tTwoTailedP(t, df);
  const rc = Math.max(-0.999999, Math.min(0.999999, partialR));
  const z = Math.atanh(rc), se = 1 / Math.sqrt(n - k - 3);
  const ci95: [number, number] = [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];

  return { kind: 'partial-correlation', x: xName, y: yName, controls: controlNames, n, partialR, zeroOrderR, df, t, p, ci95 };
}

// Ordinary least squares fit for a design matrix X (intercept column included)
// and response y. Returns coefficients, residual SSE, and (X'X)⁻¹ for SEs.
function olsFit(X: number[][], y: number[]): { beta: number[]; sse: number; XtXinv: number[][] } | null {
  const Xt = transpose(X);
  const XtXinv = invert(matMul(Xt, X));
  if (!XtXinv) return null;
  const beta = matMul(XtXinv, matMul(Xt, y.map(v => [v]))).map(r => r[0]);
  let sse = 0;
  for (let i = 0; i < X.length; i++) {
    const pred = X[i].reduce((s, x, j) => s + x * beta[j], 0);
    sse += (y[i] - pred) ** 2;
  }
  return { beta, sse, XtXinv };
}

// ---------------------------------------------------------------------------
// ANCOVA — test a categorical factor's effect on a continuous outcome while
// adjusting for one or more continuous covariates. The factor's adjusted SS is
// the drop in residual SS when the dummy-coded factor is added to a model that
// already contains the covariates (Type-III-style for the factor): F =
// (ΔSS/df_factor) / (SSE_full/df_error). Reports covariate effects and adjusted
// (estimated-marginal) means at the grand-mean covariate values. With zero
// covariates it reduces exactly to one-way ANOVA (verified in stats.verify.mjs).
// ---------------------------------------------------------------------------
export function ancova(
  dvName: string, factorName: string, covariateNames: string[],
  y: number[], factorLabels: (string | number | null)[], covs: number[][],
): AncovaResult | null {
  const kcov = covariateNames.length;
  const len = Math.min(y.length, factorLabels.length, ...(covs.length ? covs.map(c => c.length) : [y.length]));
  const I: number[] = [];
  for (let i = 0; i < len; i++) {
    const fl = factorLabels[i];
    if (Number.isFinite(y[i]) && fl !== null && fl !== '' && covs.every(c => Number.isFinite(c[i]))) I.push(i);
  }
  const n = I.length;
  const yv = I.map(i => y[i]);
  const fv = I.map(i => String(factorLabels[i]));
  const cv = covs.map(c => I.map(i => c[i]));
  const levels = [...new Set(fv)].sort();
  const L = levels.length;
  const pFull = 1 + kcov + (L - 1);                 // intercept + covariates + dummies
  if (L < 2 || n < pFull + 1) return null;

  const base = (i: number) => [1, ...cv.map(c => c[i])];
  const dum = (i: number) => { const d: number[] = []; for (let l = 1; l < L; l++) d.push(fv[i] === levels[l] ? 1 : 0); return d; };
  const full = olsFit(yv.map((_, i) => [...base(i), ...dum(i)]), yv);
  const red = olsFit(yv.map((_, i) => base(i)), yv);
  if (!full || !red) return null;

  const dfFactor = L - 1;
  const dfError = n - pFull;
  if (dfError < 1) return null;
  const ssFactor = red.sse - full.sse;
  const ssError = full.sse;
  const msFactor = ssFactor / dfFactor;
  const msError = ssError / dfError;
  const F = msFactor / msError;
  const p = fUpperP(F, dfFactor, dfError);
  const partialEtaSq = ssFactor / (ssFactor + ssError);

  const covariateEffects = covariateNames.map((name, c) => {
    const j = 1 + c;
    const b = full.beta[j];
    const se = Math.sqrt(msError * full.XtXinv[j][j]);
    const t = b / se;
    return { name, b, se, t, p: tTwoTailedP(t, dfError) };
  });

  const covMeans = cv.map(c => mean(c));
  const adjustedMeans = levels.map((lev, l) => {
    let m = full.beta[0];
    for (let c = 0; c < kcov; c++) m += full.beta[1 + c] * covMeans[c];
    if (l >= 1) m += full.beta[1 + kcov + (l - 1)];
    return { level: lev, n: fv.filter(f => f === lev).length, adjMean: m };
  });

  return {
    kind: 'ancova', dv: dvName, factor: factorName, covariates: covariateNames, n, levels,
    ssFactor, dfFactor, msFactor, ssError, dfError, msError, F, p, partialEtaSq,
    covariateEffects, adjustedMeans,
  };
}

// ---------------------------------------------------------------------------
// Confirmatory Factor Analysis (CFA) — maximum-likelihood, simple structure
// ---------------------------------------------------------------------------
// Tests a researcher-specified measurement model where each item loads on
// exactly one factor and factors may correlate. Parameterization: factor
// variances fixed to 1 (std.lv), so loadings, error variances, and factor
// correlations are the free parameters.
//
//   Σ(θ) = Λ Φ Λ' + Θ        (Θ diagonal, Φ unit-diagonal correlation matrix)
//
// Estimated by minimizing the normal-theory ML discrepancy function
//   F_ML = log|Σ| + tr(S Σ⁻¹) − log|S| − p
// via BFGS with a numerical gradient. The minimum-fit-function test statistic
// is χ² = (N−1)·F_ML on df = p(p+1)/2 − q. Incremental/approximate fit follows
// Bentler (1990, CFI), Tucker–Lewis (1973, TLI), Steiger (1990, RMSEA) and the
// standardized RMR (SRMR). Verified by Monte-Carlo recovery, the exact
// independence-model identity (F₀ = −log|R|), and just-identified χ²≈0 checks
// (see stats.cfa.verify.ts). For models with cross-loadings, method factors,
// higher-order structure, or non-normal/ordinal data, use lavaan/Mplus.

// log-determinant of a symmetric PD matrix via its eigenvalues.
function logDetSym(M: number[][]): number {
  const { values } = jacobi(M);
  let s = 0;
  for (const v of values) { if (v <= 1e-12) return NaN; s += Math.log(v); }
  return s;
}

// Sample covariance matrix (divisor N−1) of a complete data matrix (rows = cases).
function covarianceMatrixDense(M: number[][]): number[][] {
  const n = M.length, k = M[0].length;
  const mu = new Array(k).fill(0);
  for (const row of M) for (let j = 0; j < k; j++) mu[j] += row[j];
  for (let j = 0; j < k; j++) mu[j] /= n;
  const C = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const row of M) for (let i = 0; i < k; i++) for (let j = i; j < k; j++) C[i][j] += (row[i] - mu[i]) * (row[j] - mu[j]);
  for (let i = 0; i < k; i++) for (let j = i; j < k; j++) { C[i][j] /= (n - 1); C[j][i] = C[i][j]; }
  return C;
}

// Numerical gradient (central differences).
function numGrad(f: (x: number[]) => number, x: number[], h = 1e-5): number[] {
  const g = new Array(x.length).fill(0);
  for (let i = 0; i < x.length; i++) {
    const xp = [...x], xm = [...x];
    xp[i] += h; xm[i] -= h;
    g[i] = (f(xp) - f(xm)) / (2 * h);
  }
  return g;
}

// Minimal BFGS with backtracking (Armijo) line search. Minimizes f.
function bfgs(
  f: (x: number[]) => number, x0: number[],
  opts: { maxIter?: number; gtol?: number } = {},
): { x: number[]; fx: number; iters: number; converged: boolean } {
  const n = x0.length, maxIter = opts.maxIter ?? 400, gtol = opts.gtol ?? 1e-7;
  let x = [...x0];
  let H = Array.from({ length: n }, (_, i) => { const r = new Array(n).fill(0); r[i] = 1; return r; }); // inverse-Hessian approx
  let g = numGrad(f, x);
  let fx = f(x);
  let iters = 0, converged = false;
  for (; iters < maxIter; iters++) {
    const gnorm = Math.sqrt(g.reduce((a, b) => a + b * b, 0));
    if (gnorm < gtol) { converged = true; break; }
    // search direction d = −H g
    const d = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += H[i][j] * g[j]; d[i] = -s; }
    // Armijo backtracking
    const slope = g.reduce((a, gi, i) => a + gi * d[i], 0);
    let step = 1, fnew = fx; const xnew = [...x];
    if (slope >= 0) { // not a descent direction — reset to steepest descent
      for (let i = 0; i < n; i++) d[i] = -g[i];
    }
    let ok = false;
    for (let bt = 0; bt < 40; bt++) {
      for (let i = 0; i < n; i++) xnew[i] = x[i] + step * d[i];
      fnew = f(xnew);
      if (Number.isFinite(fnew) && fnew <= fx + 1e-4 * step * slope) { ok = true; break; }
      step *= 0.5;
    }
    if (!ok) { converged = gnorm < 1e-4; break; }
    const gnew = numGrad(f, xnew);
    const s = xnew.map((v, i) => v - x[i]);
    const y = gnew.map((v, i) => v - g[i]);
    const sy = s.reduce((a, si, i) => a + si * y[i], 0);
    if (sy > 1e-12) {
      // BFGS inverse-Hessian update: H = (I − ρ s yᵀ) H (I − ρ y sᵀ) + ρ s sᵀ
      const rho = 1 / sy;
      const Hy = new Array(n).fill(0);
      for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < n; j++) t += H[i][j] * y[j]; Hy[i] = t; }
      const yHy = y.reduce((a, yi, i) => a + yi * Hy[i], 0);
      const Hnew = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        Hnew[i][j] = H[i][j] - rho * (s[i] * Hy[j] + Hy[i] * s[j]) + rho * rho * yHy * s[i] * s[j] + rho * s[i] * s[j];
      }
      H = Hnew;
    }
    x = xnew; g = gnew; fx = fnew;
    if (Math.abs(step) * Math.sqrt(d.reduce((a, b) => a + b * b, 0)) < 1e-10) { converged = true; break; }
  }
  return { x, fx, iters, converged };
}

// Numerical Hessian (central differences) of a scalar function.
function numHessian(f: (x: number[]) => number, x: number[], h = 1e-4): number[][] {
  const n = x.length;
  const Hm = Array.from({ length: n }, () => new Array(n).fill(0));
  const f0 = f(x);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        const xp = [...x], xm = [...x]; xp[i] += h; xm[i] -= h;
        Hm[i][i] = (f(xp) - 2 * f0 + f(xm)) / (h * h);
      } else {
        const xpp = [...x], xpm = [...x], xmp = [...x], xmm = [...x];
        xpp[i] += h; xpp[j] += h; xpm[i] += h; xpm[j] -= h;
        xmp[i] -= h; xmp[j] += h; xmm[i] -= h; xmm[j] -= h;
        const v = (f(xpp) - f(xpm) - f(xmp) + f(xmm)) / (4 * h * h);
        Hm[i][j] = v; Hm[j][i] = v;
      }
    }
  }
  return Hm;
}

export function cfa(
  cols: Record<string, Cell[]>,
  spec: Record<string, string[]>,   // factor name → its items
): CfaResult | null {
  const factors = Object.keys(spec);
  const items: string[] = [];
  const itemFactor: number[] = []; // factor index per item
  factors.forEach((fac, fi) => spec[fac].forEach(it => { if (!items.includes(it)) { items.push(it); itemFactor.push(fi); } }));
  const p = items.length, m = factors.length;
  if (m < 1 || p < 3) return null;
  // each factor needs ≥2 indicators (≥3 if it is the only factor) for identification
  const perFactorCount = factors.map((_, fi) => itemFactor.filter(f => f === fi).length);
  if (m === 1 && perFactorCount[0] < 3) return null;
  if (m > 1 && perFactorCount.some(c => c < 2)) return null;

  const M = completeMatrix(cols, items);
  const n = M.length;
  if (n < p + 5) return null;
  const S = covarianceMatrixDense(M);
  const logDetS = logDetSym(S);
  if (!Number.isFinite(logDetS)) return null;

  const nCorr = (m * (m - 1)) / 2;
  const q = 2 * p + nCorr;          // p loadings + p error variances + factor correlations
  const df = (p * (p + 1)) / 2 - q;
  const warnings: string[] = [];
  if (df < 0) return null;          // model not identified (negative df)

  // correlation-index pairs for the m factors (upper triangle, row-major)
  const corrPairs: [number, number][] = [];
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) corrPairs.push([a, b]);

  // ---- parameter packing ----
  // θ = [ λ_1..λ_p, u_1..u_p (log error var), z_1..z_nCorr (atanh factor corr) ]
  const buildSigma = (theta: number[]): { Sigma: number[][]; lam: number[]; thetaErr: number[]; Phi: number[][] } | null => {
    const lam = theta.slice(0, p);
    const thetaErr = theta.slice(p, 2 * p).map(u => Math.exp(u));
    const Phi = Array.from({ length: m }, (_, i) => { const r = new Array(m).fill(0); r[i] = 1; return r; });
    corrPairs.forEach(([a, b], i) => { const r = Math.tanh(theta[2 * p + i]); Phi[a][b] = r; Phi[b][a] = r; });
    // Σ = Λ Φ Λ' + Θ
    const Sigma = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      let s = lam[i] * lam[j] * Phi[itemFactor[i]][itemFactor[j]];
      if (i === j) s += thetaErr[i];
      Sigma[i][j] = s;
    }
    return { Sigma, lam, thetaErr, Phi };
  };

  const fML = (theta: number[]): number => {
    const built = buildSigma(theta);
    if (!built) return 1e10;
    const { Sigma } = built;
    const inv = invert(Sigma);
    const logDetSigma = logDetSym(Sigma);
    if (!inv || !Number.isFinite(logDetSigma)) return 1e10;
    let trace = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) trace += S[i][j] * inv[j][i];
    const f = logDetSigma + trace - logDetS - p;
    return Number.isFinite(f) && f >= -1e-6 ? Math.max(f, 0) : 1e10;
  };

  // ---- starting values ----
  // loadings: √(0.6·variance) on the item's factor; errors: 0.4·variance; corr: 0.3
  const theta0: number[] = [];
  for (let i = 0; i < p; i++) theta0.push(Math.sqrt(Math.max(0.05, 0.6 * S[i][i])));
  for (let i = 0; i < p; i++) theta0.push(Math.log(Math.max(0.05, 0.4 * S[i][i])));
  for (let i = 0; i < nCorr; i++) theta0.push(Math.atanh(0.3));

  const opt = bfgs(fML, theta0, { maxIter: 600, gtol: 1e-8 });
  const built = buildSigma(opt.x);
  if (!built) return null;
  const { Sigma, lam, thetaErr, Phi } = built;
  const fMin = Math.max(opt.fx, 0);
  if (!opt.converged) warnings.push('Optimizer did not fully converge — interpret estimates with caution.');

  // ---- standard errors: Acov(θ̂) ≈ (2/(N−1)) · [∂²F/∂θ²]⁻¹ ----
  let seLam = new Array(p).fill(NaN);
  const Hess = numHessian(fML, opt.x);
  const Hinv = invert(Hess);
  if (Hinv) {
    for (let i = 0; i < p; i++) {
      const v = (2 / (n - 1)) * Hinv[i][i];
      seLam[i] = v > 0 ? Math.sqrt(v) : NaN;
    }
  } else warnings.push('Standard errors unavailable (Hessian not invertible).');

  // ---- model test ----
  const chi2 = (n - 1) * fMin;
  const chi2P = df > 0 ? chiSqUpperP(chi2, df) : 1;

  // ---- baseline (independence) model: Σ₀ = diag(S) ----
  // F₀ = Σ log(S_ii) − log|S| = −log|R|.  Verified identity.
  let sumLogDiag = 0;
  for (let i = 0; i < p; i++) sumLogDiag += Math.log(S[i][i]);
  const f0 = sumLogDiag - logDetS;
  const baselineChi2 = (n - 1) * f0;
  const baselineDf = (p * (p - 1)) / 2;

  // ---- incremental + approximate fit ----
  const d = Math.max(chi2 - df, 0);
  const d0 = Math.max(baselineChi2 - baselineDf, 0);
  const cfi = d0 > 0 ? 1 - d / Math.max(d0, d, 1e-12) : 1;
  const ratioBase = baselineChi2 / baselineDf;
  const ratioModel = df > 0 ? chi2 / df : 0;
  const tli = (ratioBase - 1) !== 0 ? (ratioBase - ratioModel) / (ratioBase - 1) : 1;
  const rmsea = df > 0 ? Math.sqrt(d / (df * (n - 1))) : 0;

  // ---- SRMR: standardized residuals of S vs Σ̂, lower triangle incl. diagonal ----
  let srmrSum = 0, srmrCount = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    const r = (S[i][j] - Sigma[i][j]) / Math.sqrt(S[i][i] * S[j][j]);
    srmrSum += r * r; srmrCount++;
  }
  const srmr = Math.sqrt(srmrSum / srmrCount);

  // ---- estimates (standardized) ----
  const loadings: CfaLoading[] = items.map((it, i) => {
    const implVar = lam[i] * lam[i] + thetaErr[i]; // = Σ̂_ii
    const std = lam[i] / Math.sqrt(implVar);
    const se = seLam[i];
    const z = Number.isFinite(se) ? lam[i] / se : NaN;
    return {
      factor: factors[itemFactor[i]], item: it,
      std, unstd: lam[i], se,
      z, p: Number.isFinite(z) ? tTwoTailedP(z, 1e6) : NaN, // z → normal tail
    };
  });
  const errorVariances = items.map((it, i) => {
    const implVar = lam[i] * lam[i] + thetaErr[i];
    const stdErrVar = thetaErr[i] / implVar; // standardized residual variance
    return { item: it, theta: thetaErr[i], r2: 1 - stdErrVar };
  });
  const factorCorrelations = corrPairs.map(([a, b]) => ({ f1: factors[a], f2: factors[b], r: Phi[a][b] }));

  // ---- per-factor ω (composite reliability) + AVE from standardized loadings ----
  const reliability = factors.map((fac) => {
    const stdLoads = loadings.filter(l => l.factor === fac).map(l => l.std);
    const sumL = stdLoads.reduce((a, b) => a + b, 0);
    const sumUniq = stdLoads.reduce((a, l) => a + (1 - l * l), 0);
    const sumL2 = stdLoads.reduce((a, l) => a + l * l, 0);
    const omega = (sumL * sumL) / (sumL * sumL + sumUniq);
    const ave = sumL2 / stdLoads.length;
    return { factor: fac, omega, ave };
  });

  if (loadings.some(l => Math.abs(l.std) > 1.0001)) warnings.push('A standardized loading exceeds 1 (Heywood case) — the solution may be improper.');
  if (errorVariances.some(e => e.theta <= 0)) warnings.push('A negative error variance was estimated (Heywood case).');

  return {
    kind: 'cfa', items, factors, spec, n, p, q, df,
    converged: opt.converged, iterations: opt.iters, fMin,
    chi2, chi2P, baselineChi2, baselineDf,
    cfi, tli, rmsea, srmr,
    loadings, errorVariances, factorCorrelations, reliability, warnings,
  };
}

// ---------------------------------------------------------------------------
// Assumption diagnostics — thin compositions over the verified primitives
// above (qnorm, median, oneWayAnova). No new inferential machinery.
// ---------------------------------------------------------------------------

/** Normal Q-Q plot coordinates using Blom (1958) plotting positions
 *  ((i − 0.375)/(n + 0.25)). Sample values are standardized so the identity
 *  line is the normal-fit reference. Returns [] when n < 3 or SD is 0. */
export function qqPoints(values: number[]): { theoretical: number; sample: number }[] {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const n = v.length;
  if (n < 3) return [];
  const m = mean(v), s = sd(v);
  if (!(s > 0)) return [];
  return v.map((x, i) => ({ theoretical: qnorm((i + 1 - 0.375) / (n + 0.25)), sample: (x - m) / s }));
}

/** Brown-Forsythe (1974) robust homogeneity-of-variance test: one-way ANOVA
 *  on absolute deviations from each group MEDIAN (robust to non-normality,
 *  unlike Levene's mean-centred original). */
export function brownForsythe(groups: { level: string; values: number[] }[]):
  { F: number; df1: number; df2: number; p: number } | null {
  const gs = groups.filter(g => g.values.filter(Number.isFinite).length > 1);
  if (gs.length < 2) return null;
  const trans = gs.map(g => {
    const vals = g.values.filter(Number.isFinite);
    const md = median(vals);
    return { level: g.level, values: vals.map(x => Math.abs(x - md)) };
  });
  const a = oneWayAnova('absdev', 'group', trans);
  return { F: a.fStat, df1: a.dfBetween, df2: a.dfWithin, p: a.p };
}
