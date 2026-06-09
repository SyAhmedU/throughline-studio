// ============================================================================
// Throughline Studio — Collect stage power / sample-size helpers.
// Textbook closed-form approximations (Cohen 1988): two-group t-test via the
// normal approximation, and correlation via the Fisher-z transform. Clearly
// approximate (noncentral-t exactness lives in ToolsScope); good enough to plan
// a target N. Inverse-normal by bisection on the verified normalCdf.
// ============================================================================

import { normalCdf } from './stats'

/** Inverse standard-normal CDF via bisection on normalCdf (p in (0,1)). */
export function invNorm(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  let lo = -10,
    hi = 10
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (normalCdf(mid) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** N per group for an independent two-group t-test (Cohen's d). */
export function nPerGroup(d: number, alpha = 0.05, power = 0.8): number {
  if (!(d > 0)) return NaN
  const za = invNorm(1 - alpha / 2)
  const zb = invNorm(power)
  return Math.ceil((2 * (za + zb) ** 2) / (d * d))
}

/** Total N to detect a correlation r (Fisher-z approximation). */
export function nForCorr(r: number, alpha = 0.05, power = 0.8): number {
  const ar = Math.abs(r)
  if (!(ar > 0) || ar >= 1) return NaN
  const za = invNorm(1 - alpha / 2)
  const zb = invNorm(power)
  const zr = 0.5 * Math.log((1 + ar) / (1 - ar))
  return Math.ceil(((za + zb) / zr) ** 2 + 3)
}
