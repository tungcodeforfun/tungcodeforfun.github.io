import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * The shader throws if WebGL is unavailable or the GPU rejects the program.
 * When that happens the page falls back to a static gradient instead of a blank screen.
 */
export class BackgroundBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.warn('Background shader failed, using static fallback', error, info)
  }

  render() {
    if (this.state.failed) return <div className="ribbon-field ribbon-field--static" aria-hidden="true" data-testid="background-fallback" />
    return this.props.children
  }
}
