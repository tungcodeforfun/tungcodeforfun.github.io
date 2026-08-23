import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { failed: boolean }

const DEFAULT_FALLBACK = <div className="shader ribbon-field ribbon-field--static" aria-hidden="true" data-testid="background-fallback" />

/**
 * A shader throws if WebGL is unavailable or the GPU rejects the program.
 * When that happens the slot shows a static fallback instead of a blank.
 */
export class BackgroundBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.warn('Shader failed, using static fallback', error, info)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? DEFAULT_FALLBACK
    return this.props.children
  }
}
