// ============================================================================
// Throughline Studio — app shell + routing.
// ============================================================================

import { lazy, Suspense, useEffect } from 'react'
import { Ambient } from './components/Ambient'
import { BrandBar } from './components/BrandBar'
import { navigate, parseRoute, useHash } from './lib/router'
import { createProject, saveProject } from './lib/store'
import { useCloudSync } from './lib/useCloudSync'
import { Hub } from './views/Hub'
import { ProjectView } from './views/ProjectView'

// Worked examples carry 20 detailed case studies; load that chunk on demand so
// it never weighs down the hub/workspace.
const Examples = lazy(() => import('./views/Examples').then((m) => ({ default: m.Examples })))

// The verified knowledge graph is its own chunk — it streams the corpus
// snapshots, so it should never weigh down the hub.
const GraphMap = lazy(() => import('./views/GraphMap').then((m) => ({ default: m.GraphMap })))

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

  // Suite topic hand-off (hub Quick Start → here), same pattern as ?seed=/?idea=
  // on the other tools: read ?topic= once on a bare URL, strip it, spin up a
  // project with the question pre-filled, and land in the workspace.
  useEffect(() => {
    const topic = (new URLSearchParams(window.location.search).get('topic') || '').trim()
    if (!topic) return
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    const p = saveProject({ ...createProject(topic.slice(0, 80), ''), question: topic })
    navigate(`/p/${p.id}`)
  }, [])

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
        ) : route.name === 'graph' ? (
          <Suspense fallback={<div className="route-loading">Loading the verified graph…</div>}>
            <GraphMap code={route.code} />
          </Suspense>
        ) : (
          <Hub />
        )}
      </div>
    </div>
  )
}
