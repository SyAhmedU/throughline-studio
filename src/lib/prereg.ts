// ============================================================================
// Throughline Studio — preregistration assembly + lock state.
// The prereg is assembled from the study's accumulated plan (question,
// hypotheses, design, measures) plus the Collect-stage plans, and LOCKED with a
// timestamp BEFORE fielding — preregistration is a pre-data-collection act, so
// it lives in the Collect stage. Publish only shows the frozen document.
// Older projects stored the plan fields on the Publish stage; readers here
// fall back to those so nothing a user wrote is lost.
// ============================================================================

import type { SavedScale } from './scales'
import type { SavedTheory } from './theories'
import type { Project } from './types'

/** The three free-text plans + the frozen document (lives in collect.data). */
export interface PreregPlans {
  samplingPlan?: string
  analysisPlan?: string
  exclusions?: string
  /** frozen assembled text — set when locked, cleared on unlock */
  preregText?: string
  /** epoch ms of the lock — the timestamp that makes it a preregistration */
  preregLockedAt?: number
  /** immutable trail: every earlier lock is pushed here on unlock, never
   *  edited — an unlock-relock cycle must not be able to erase its own past */
  preregHistory?: PreregVersion[]
}

export interface PreregVersion {
  text: string
  lockedAt: number
  unlockedAt: number
}

interface FrameData {
  hypotheses?: string[]
  design?: string
  iv?: string
  dv?: string
  mediators?: string
  moderators?: string
  theory?: SavedTheory | null
}

function frameData(p: Project): FrameData {
  return (p.stages.frame?.data || {}) as FrameData
}
function measureScales(p: Project): SavedScale[] {
  return ((p.stages.measure?.data as { scales?: SavedScale[] })?.scales) || []
}
function collectPlans(p: Project): PreregPlans {
  return (p.stages.collect?.data || {}) as PreregPlans
}
/** Legacy location — plan fields written by the old Publish-stage editor. */
function legacyPublishPlans(p: Project): PreregPlans {
  return (p.stages.publish?.data || {}) as PreregPlans
}

/** Current editable plan values: Collect first, falling back to legacy Publish. */
export function planValues(p: Project): Required<Pick<PreregPlans, 'samplingPlan' | 'analysisPlan' | 'exclusions'>> {
  const c = collectPlans(p)
  const legacy = legacyPublishPlans(p)
  return {
    samplingPlan: c.samplingPlan ?? legacy.samplingPlan ?? '',
    analysisPlan: c.analysisPlan ?? legacy.analysisPlan ?? '',
    exclusions: c.exclusions ?? legacy.exclusions ?? '',
  }
}

/** The frozen prereg, if locked. */
export function preregLock(p: Project): { text: string; lockedAt: number } | null {
  const c = collectPlans(p)
  if (c.preregText && c.preregLockedAt) return { text: c.preregText, lockedAt: c.preregLockedAt }
  return null
}

/** Assemble the preregistration document from the study so far. */
export function buildPrereg(p: Project, plans: PreregPlans): string {
  const frame = frameData(p)
  const scales = measureScales(p)
  const out: string[] = [`# Preregistration — ${p.title}`]
  if (p.question) out.push(`\n## Research question\n${p.question}`)
  if (frame.theory?.name) out.push(`\n## Theoretical lens\n${frame.theory.name}${frame.theory.citation ? ` (${frame.theory.citation})` : ''}`)
  if (frame.hypotheses?.length)
    out.push(`\n## Hypotheses\n` + frame.hypotheses.map((h, i) => `H${i + 1}: ${h}`).join('\n'))
  if (frame.design) {
    const model = [
      frame.iv ? `IV: ${frame.iv}` : '',
      frame.dv ? `DV: ${frame.dv}` : '',
      frame.mediators ? `Mediator(s): ${frame.mediators}` : '',
      frame.moderators ? `Moderator(s): ${frame.moderators}` : '',
    ].filter(Boolean)
    out.push(`\n## Design\n${frame.design}${model.length ? '\n' + model.join(' · ') : ''}`)
  }
  out.push(`\n## Sampling plan\n${plans.samplingPlan?.trim() || '(to write)'}`)
  if (scales.length)
    out.push(
      `\n## Measures\n` +
        scales
          .map((s) => `- ${s.name}${s.abbreviation ? ` (${s.abbreviation})` : ''}, ${s.itemCount} items (${s.citation})`)
          .join('\n'),
    )
  out.push(`\n## Analysis plan\n${plans.analysisPlan?.trim() || '(to write)'}`)
  out.push(`\n## Exclusion criteria\n${plans.exclusions?.trim() || '(to write)'}`)
  return out.join('\n')
}

export function fmtLockDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
