import type { Dataset, Cell } from './types';
import { tTwoTailedP, normalCdf } from './stats.ts';

export const ENGINE_VERSION = 'design-aware-1.0.0';
export type Method = 'hc3' | 'cluster' | 'mixed' | 'survey';
export interface Spec { method: Method; outcome: string; predictors: string[]; group: string; weight: string; strata: string }
export interface Estimate { term: string; estimate: number; se: number; low: number; high: number; p: number }
export interface Analysis {
  method: Method; n: number; included: number[]; excluded: { row: number; reason: string }[];
  estimates: Estimate[]; df: number | null; warnings: string[];
  metrics: Record<string, number>; diagnostics: { row: number; fitted: number; residual: number; leverage: number; cooksD: number }[];
}
export const blank = (v: Cell | undefined) => v == null || (typeof v === 'string' && !v.trim());
const numeric = (v: Cell | undefined) => !blank(v) && Number.isFinite(Number(v));
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const zeros = (n: number) => Array.from({ length: n }, () => Array(n).fill(0) as number[]);
function inverse(a: number[][]): { inv: number[][]; logdet: number } {
  // Positive-definite Cholesky, with a relative rank guard. No silent ridge.
  const n = a.length, l = zeros(n); let logdet = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let v = a[i][j]; for (let k = 0; k < j; k++) v -= l[i][k] * l[j][k];
    if (i === j) {
      if (!Number.isFinite(v) || v <= 1e-12 * Math.max(1, a[i][i])) throw Error('Predictors are constant, collinear or numerically ill-conditioned. Rescale or remove redundant predictors.');
      l[i][j] = Math.sqrt(v); logdet += Math.log(v);
    } else l[i][j] = v / l[j][j];
  }
  const inv = zeros(n);
  for (let c = 0; c < n; c++) {
    const u = Array(n).fill(0), v = Array(n).fill(0);
    for (let i = 0; i < n; i++) { let x = i === c ? 1 : 0; for (let j = 0; j < i; j++) x -= l[i][j] * u[j]; u[i] = x / l[i][i]; }
    for (let i = n - 1; i >= 0; i--) { let x = u[i]; for (let j = i + 1; j < n; j++) x -= l[j][i] * v[j]; v[i] = x / l[i][i]; }
    for (let i = 0; i < n; i++) inv[i][c] = v[i];
  }
  return { inv, logdet };
}
const multiply = (a: number[][], b: number[][]) => a.map(row => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
function outerAdd(a: number[][], v: number[], scale = 1) { for (let j = 0; j < v.length; j++) for (let k = 0; k < v.length; k++) a[j][k] += scale * v[j] * v[k]; }
export function criticalT(df: number): number {
  if (!(df > 0)) throw Error('Positive inference degrees of freedom are required.');
  let lo = 0, hi = 1; while (tTwoTailedP(hi, df) > .05) hi *= 2;
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2; if (tTwoTailedP(mid, df) > .05) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function estimate(term: string, b: number, variance: number, df: number | null): Estimate {
  if (!(variance > 0) || !Number.isFinite(variance)) throw Error('Inference is undefined: zero or invalid estimated variance. Inspect the data and design.');
  const se = Math.sqrt(variance), critical = df === null ? 1.959963984540054 : criticalT(df);
  const p = df === null ? 2 * (1 - normalCdf(Math.abs(b / se))) : tTwoTailedP(b / se, df);
  return { term, estimate: b, se, low: b - critical * se, high: b + critical * se, p: Math.max(0, Math.min(1, p)) };
}
export function analyzeDesign(dataset: Dataset, spec: Spec): Analysis {
  if (!['hc3', 'cluster', 'mixed', 'survey'].includes(spec.method)) throw Error('Unknown method.');
  const survey = spec.method === 'survey', grouped = spec.method === 'cluster' || spec.method === 'mixed';
  const required = [spec.outcome, ...(survey ? [spec.weight] : spec.predictors), ...(grouped ? [spec.group] : []), ...(survey ? [spec.group, spec.strata].filter(Boolean) : [])];
  const names = dataset.variables.map(v => v.name);
  if (required.some(v => !v || !names.includes(v))) throw Error('Choose all required variables from the dataset.');
  if (new Set(required).size !== required.length) throw Error('Each selected variable must have a distinct role.');
  if (!survey && !spec.predictors.length) throw Error('Select at least one numeric predictor.');
  if (dataset.rows.length > (spec.method === 'mixed' ? 10000 : 100000) || (!survey && spec.predictors.length > (spec.method === 'mixed' ? 20 : 50))) throw Error('This browser engine supports up to 10,000 rows / 20 predictors for REML and 100,000 rows / 50 predictors otherwise. Use a specialist statistical environment for larger models.');
  const included: number[] = [], excluded: Analysis['excluded'] = [], rows: Dataset['rows'] = [];
  dataset.rows.forEach((r, i) => {
    const missing = required.filter(v => blank(r[v]));
    const invalid = [spec.outcome, ...(survey ? [spec.weight] : spec.predictors)].filter(v => !blank(r[v]) && !numeric(r[v]));
    if (invalid.length) throw Error(`Row ${i + 1}: non-finite/non-numeric value in ${invalid.join(', ')}. Correct the data before analysis.`);
    if (survey && numeric(r[spec.weight]) && Number(r[spec.weight]) <= 0) throw Error(`Row ${i + 1}: survey weights must be positive.`);
    if (missing.length) excluded.push({ row: i + 1, reason: `Missing: ${missing.join(', ')}` });
    else { included.push(i + 1); rows.push(r); }
  });
  const n = rows.length, warnings = ['Complete-case analysis for selected variables; exclusions do not establish that missingness is ignorable.'];
  const result: Analysis = { method: spec.method, n, included, excluded, estimates: [], df: null, warnings, metrics: {}, diagnostics: [] };
  if (n < 3) throw Error('At least three complete observations are required.');
  const y = rows.map(r => Number(r[spec.outcome]));
  if (survey) {
    const weights = rows.map(r => Number(r[spec.weight])), total = weights.reduce((a, b) => a + b, 0), mu = dot(weights, y) / total;
    const strata = new Map<string, Map<string, number>>();
    rows.forEach((r, i) => {
      const h = spec.strata ? JSON.stringify(r[spec.strata]) : 'all', g = spec.group ? JSON.stringify(r[spec.group]) : String(i);
      if (!strata.has(h)) strata.set(h, new Map());
      const psus = strata.get(h)!; psus.set(g, (psus.get(g) || 0) + weights[i] * (y[i] - mu));
    });
    let v = 0, psuCount = 0;
    for (const psus of strata.values()) {
      const values = [...psus.values()], m = values.length;
      if (m < 2) throw Error('Every retained stratum needs at least two PSUs. Singleton strata are not silently adjusted.');
      const avg = values.reduce((a, b) => a + b, 0) / m;
      v += m / (m - 1) * values.reduce((s, z) => s + (z - avg) ** 2, 0); psuCount += m;
    }
    const df = psuCount - strata.size;
    result.df = df; result.estimates = [estimate(spec.outcome, mu, v / total ** 2, df)];
    result.metrics = { weightSum: total, psus: psuCount, strata: strata.size, kishWeightOnlyN: total ** 2 / dot(weights, weights) };
    warnings.push('Single-stage, with-replacement Taylor variance for a weighted mean. No finite-population correction, calibration, replicate weights or domain estimation. PSU identifiers are nested within strata.');
    return result;
  }
  const k = spec.predictors.length + 1;
  if (n <= k + 1) throw Error('More complete observations than model parameters + 1 are required.');
  const x = rows.map(r => [1, ...spec.predictors.map(v => Number(r[v]))]);
  const groups = new Map<string, number[]>();
  rows.forEach((r, i) => { const key = grouped ? JSON.stringify(r[spec.group]) : String(i); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(i); });
  if (grouped && groups.size < 3) throw Error('At least three independent groups are required.');
  if (grouped && groups.size < 30) warnings.push('Fewer than 30 groups: group-level inference can be unstable. The threshold is a caution, not a validity guarantee.');
  const xtx = zeros(k), xty = Array(k).fill(0) as number[];
  x.forEach((r, i) => { outerAdd(xtx, r); r.forEach((v, j) => xty[j] += v * y[i]); });
  const bread = inverse(xtx).inv;
  let beta = bread.map(r => dot(r, xty)), covariance: number[][];
  const residual = y.map((v, i) => v - dot(x[i], beta));
  const sse = dot(residual, residual);
  if (sse <= Number.EPSILON * Math.max(1, dot(y, y))) throw Error('Perfect or numerically near-perfect fit: inferential variance is not reliable.');
  if (spec.method === 'mixed') {
    if ([...groups.values()].every(g => g.length === 1)) throw Error('A random intercept needs repeated observations within groups.');
    const profile = (lambda: number) => {
      const a = xtx.map(r => [...r]), b = [...xty]; let logV = 0;
      for (const indices of groups.values()) {
        const sx = Array(k).fill(0), sy = indices.reduce((s, i) => s + y[i], 0), factor = lambda / (1 + lambda * indices.length);
        indices.forEach(i => x[i].forEach((v, j) => sx[j] += v));
        outerAdd(a, sx, -factor); sx.forEach((v, j) => b[j] -= factor * v * sy); logV += Math.log1p(lambda * indices.length);
      }
      const decomposition = inverse(a), coefficients = decomposition.inv.map(r => dot(r, b));
      const errors = y.map((v, i) => v - dot(x[i], coefficients)); let q = dot(errors, errors);
      for (const indices of groups.values()) q -= lambda / (1 + lambda * indices.length) * indices.reduce((s, i) => s + errors[i], 0) ** 2;
      if (!(q > 0)) throw Error('REML residual variance is not identifiable.');
      return { objective: (n - k) * Math.log(q / (n - k)) + logV + decomposition.logdet, coefficients, inv: decomposition.inv, sigma: q / (n - k), lambda };
    };
    // Coarse global bracket followed by bounded golden-section minimization.
    const grid = Array.from({ length: 65 }, (_, i) => -16 + i * .5);
    const fits = grid.map(v => profile(Math.exp(v))); let best = 0;
    fits.forEach((f, i) => { if (f.objective < fits[best].objective) best = i; });
    if (best === grid.length - 1) throw Error('Random-intercept variance reached the search bound; use a specialist mixed-model package.');
    let lo = grid[Math.max(0, best - 1)], hi = grid[Math.min(grid.length - 1, best + 1)];
    for (let i = 0; i < 90; i++) { const a = hi - (hi - lo) / 1.61803398875, b = lo + (hi - lo) / 1.61803398875; if (profile(Math.exp(a)).objective < profile(Math.exp(b)).objective) hi = b; else lo = a; }
    let fit = profile(Math.exp((lo + hi) / 2)); const boundary = profile(0);
    if (boundary.objective <= fit.objective + 1e-9) { fit = boundary; warnings.push('Random-intercept variance is on the zero boundary.'); }
    beta = fit.coefficients; covariance = fit.inv.map(r => r.map(v => v * fit.sigma));
    result.metrics = { groups: groups.size, residualVariance: fit.sigma, interceptVariance: fit.lambda * fit.sigma, ICC: fit.lambda / (1 + fit.lambda) };
    warnings.push('Gaussian random-intercept REML with one grouping factor. Fixed-effect CIs use asymptotic normal Wald inference conditional on estimated variance components; no Satterthwaite correction. No random slopes or non-Gaussian outcomes.');
  } else {
    const meat = zeros(k), leverage = x.map(r => dot(r, bread.map(b => dot(b, r))));
    if (leverage.some(h => h >= 1 - 1e-10)) throw Error('Unit leverage prevents reliable robust inference.');
    if (spec.method === 'hc3') x.forEach((r, i) => outerAdd(meat, r, residual[i] ** 2 / (1 - leverage[i]) ** 2));
    else {
      const correction = groups.size / (groups.size - 1) * (n - 1) / (n - k);
      for (const indices of groups.values()) { const score = Array(k).fill(0); indices.forEach(i => x[i].forEach((v, j) => score[j] += v * residual[i])); outerAdd(meat, score, correction); }
      result.metrics.groups = groups.size;
    }
    covariance = multiply(multiply(bread, meat), bread);
    result.df = spec.method === 'cluster' ? groups.size - 1 : n - k;
    const mse = sse / (n - k), avg = y.reduce((a, b) => a + b, 0) / n, total = y.reduce((a, v) => a + (v - avg) ** 2, 0);
    result.metrics.rSquared = 1 - sse / total;
    result.diagnostics = x.map((r, i) => ({ row: included[i], fitted: dot(r, beta), residual: residual[i], leverage: leverage[i], cooksD: residual[i] ** 2 / (k * mse) * leverage[i] / (1 - leverage[i]) ** 2 }));
    warnings.push(spec.method === 'hc3' ? 'HC3 covariance with t inference (n − k degrees of freedom); observations must be independent.' : 'One-way CR1 covariance with G/(G−1) × (n−1)/(n−k) correction and t inference on G−1 degrees of freedom. Clusters must be independent.');
    warnings.push('Cook’s distance and leverage describe the underlying OLS fit. Flags are screening heuristics, never automatic exclusions.');
  }
  result.estimates = ['Intercept', ...spec.predictors].map((v, i) => estimate(v, beta[i], covariance[i][i], result.df));
  return result;
}

export async function fingerprint(dataset: Dataset): Promise<string> {
  // Fixed column order, row order and explicit nulls define a version; metadata is included.
  const bytes = new TextEncoder().encode(JSON.stringify({ variables: dataset.variables, rows: dataset.rows.map(r => dataset.variables.map(v => r[v.name] ?? null)) }));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function quality(dataset: Dataset) {
  const keys = dataset.variables.map(v => v.name), seen = new Set<string>(); let duplicates = 0;
  dataset.rows.forEach(r => { const key = JSON.stringify(keys.map(v => r[v] ?? null)); if (seen.has(key)) duplicates++; seen.add(key); });
  return { duplicates, columns: dataset.variables.map(v => {
    const values = dataset.rows.map(r => r[v.name]), present = values.filter(x => !blank(x));
    return { name: v.name, missing: values.length - present.length, invalidNumeric: ['numeric', 'likert'].includes(v.type) ? present.filter(x => !numeric(x)).length : 0, distinct: new Set(present.map(x => JSON.stringify(x))).size };
  }) };
}
