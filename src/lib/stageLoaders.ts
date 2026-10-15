import type { StageId } from './types'

// Share import functions with React.lazy so pointer/keyboard intent warms the
// actual stage chunk. No data requests, AI calls, or research-state changes.
export const stageLoaders = {
  discover: () => import('../stages/DiscoverBody').then(m => ({ default: m.DiscoverBody })),
  frame: () => import('../stages/FrameBody').then(m => ({ default: m.FrameBody })),
  measure: () => import('../stages/MeasureBody').then(m => ({ default: m.MeasureBody })),
  collect: () => import('../stages/CollectBody').then(m => ({ default: m.CollectBody })),
  analyze: () => import('../stages/AnalyzeBody').then(m => ({ default: m.AnalyzeBody })),
  write: () => import('../stages/WriteBody').then(m => ({ default: m.WriteBody })),
  publish: () => import('../stages/PublishBody').then(m => ({ default: m.PublishBody })),
}
export function warmStage(stage: StageId) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return
  void stageLoaders[stage]?.().catch(() => { /* Normal navigation retains its error/retry UI. */ })
}
