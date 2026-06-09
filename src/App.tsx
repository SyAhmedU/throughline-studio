// ============================================================================
// Throughline Studio — app shell + routing.
// ============================================================================

import { BrandBar } from './components/BrandBar'
import { parseRoute, useHash } from './lib/router'
import { useCloudSync } from './lib/useCloudSync'
import { Examples } from './views/Examples'
import { Hub } from './views/Hub'
import { ProjectView } from './views/ProjectView'

export default function App() {
  const hash = useHash()
  const route = parseRoute(hash)
  const sync = useCloudSync()

  return (
    <div className="app">
      <BrandBar syncStatus={sync.enabled ? sync.status : null} />
      <div className="app-body">
        {route.name === 'project' && route.projectId ? (
          <ProjectView projectId={route.projectId} stageId={route.stageId} />
        ) : route.name === 'examples' ? (
          <Examples slug={route.slug} />
        ) : (
          <Hub />
        )}
      </div>
    </div>
  )
}
