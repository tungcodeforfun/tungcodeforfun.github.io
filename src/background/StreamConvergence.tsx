// Vendored from MengTo/threeui (src/shaders/stream-convergence/StreamConvergenceBackground.tsx).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.

import { useEffect, useRef } from 'react'
import { startShaderLoop } from './shaderLoop'
import { useLatest } from './useLatest'
import { STREAM_CONVERGENCE_FRAGMENT_SHADER, STREAM_CONVERGENCE_VERTEX_SHADER } from './streamConvergenceShaders'

export type StreamConvergenceProps = {
  speed?: number
  /** Wavefront spread, 0 to 1. */
  fidelity?: number
  className?: string
}

const DEFAULTS = { speed: 1, fidelity: 0.5 } as const
// Upstream keys time off the page clock, so the scene never starts from its seam.
const TIME_OFFSET = 40

export function StreamConvergence({ className = '', ...props }: StreamConvergenceProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useLatest({ ...DEFAULTS, ...props })

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined
    const loop = startShaderLoop(host, canvas, {
      vertex: STREAM_CONVERGENCE_VERTEX_SHADER,
      fragment: STREAM_CONVERGENCE_FRAGMENT_SHADER,
      onResize: (u, width, height) => u.f2('u_resolution', width, height),
      onFrame: (u, seconds) => {
        const options = optionsRef.current
        u.f('u_time', (seconds + TIME_OFFSET) * 0.3 * options.speed)
        u.f('u_interactive_fidelity', options.fidelity)
      },
    })
    return () => loop?.dispose()
  }, [optionsRef])

  return (
    <div ref={hostRef} className={`shader stream-convergence${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
