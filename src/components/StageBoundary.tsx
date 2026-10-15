import { Component, type ReactNode } from 'react'

/** Keep the study header and backup export reachable if a stage fails. */
export class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <section className="ws-stage-error" role="alert">
      <h2>This stage could not open.</h2>
      <p>Export your study from the header before reloading. You can also move to another stage using the study navigation.</p>
      <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload Studio</button>
    </section>
    return this.props.children
  }
}
