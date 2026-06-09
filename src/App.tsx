// ============================================================================
// Throughline Studio — app shell + routing.
// ============================================================================

import { BrandBar } from './components/BrandBar'
import { parseRoute, useHash } from './lib/router'
import { Hub } from './views/Hub'
import { ProjectView } from './views/ProjectView'

export default function App() {
  const hash = useHash()
  const route = parseRoute(hash)

  return (
    <div className="app">
      <BrandBar />
      <div className="app-body">
        {route.name === 'project' && route.projectId ? (
          <ProjectView projectId={route.projectId} stageId={route.stageId} />
        ) : (
          <Hub />
        )}
      </div>
    </div>
  )
}
