// ============================================================================
// Throughline Studio — app shell + routing.
// ============================================================================

import { lazy, Suspense, useEffect } from 'react'
import { Ambient } from './components/Ambient'
import { BrandBar } from './components/BrandBar'
import { parseRoute, useHash } from './lib/router'
import { useCloudSync } from './lib/useCloudSync'
import { Hub } from './views/Hub'
import { ProjectView } from './views/ProjectView'

// Worked examples carry 20 detailed case studies; load that chunk on demand so
// it never weighs down the hub/workspace.
const Examples = lazy(() => import('./views/Examples').then((m) => ({ default: m.Examples })))

export default function App() {
  const hash = useHash()
  const route = parseRoute(hash)
  const sync = useCloudSync()

  // Hash routing keeps the old scroll position when the view swaps, which
  // strands you mid-page after a stage/route change. Reset to top whenever the
  // route identity changes (instant — a 2000px smooth-scroll would be worse).
  const routeKey = `${route.name}:${route.projectId ?? ''}:${route.stageId ?? ''}:${route.slug ?? ''}`
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [routeKey])

  return (
    <div className="app">
      <Ambient />
      <BrandBar syncStatus={sync.enabled ? sync.status : null} />
      <div className="app-body">
        {route.name === 'project' && route.projectId ? (
          <ProjectView projectId={route.projectId} stageId={route.stageId} />
        ) : route.name === 'examples' ? (
          <Suspense fallback={<div className="route-loading">Loading examples…</div>}>
            <Examples slug={route.slug} />
          </Suspense>
        ) : (
          <Hub />
        )}
      </div>
    </div>
  )
}
