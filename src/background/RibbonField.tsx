// Vendored from MengTo/threeui (src/shaders/ribbon-field/RibbonFieldBackground.tsx).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.
//
// Adapted for this site: pointer is read from `window` so content layered on
// top keeps the parallax, and `dim` fades the ribbons as the hero scrolls out.
// Runtime concerns (reduced motion, visibility, context loss) live in shaderLoop.

import { useEffect, useRef } from 'react'
import { RIBBON_FIELD_FRAGMENT_SHADER, RIBBON_FIELD_VERTEX_SHADER } from './ribbonFieldShaders'
import { startShaderLoop } from './shaderLoop'
import { useLatest } from './useLatest'

export { REDUCED_MOTION_QUERY, REDUCED_MOTION_SPEED } from './shaderLoop'

export type RibbonFieldProps = {
  /** Playback speed multiplier. */
  speed?: number
  /** How strongly the pointer steers the ribbons (0 disables). */
  pointerAmount?: number
  /** Pointer easing per frame; lower is lazier. */
  smoothing?: number
  /** 0 shows the ribbons at full strength, 1 fades them to the base color. */
  dim?: number
  className?: string
}

const DEFAULTS = { speed: 1.4, pointerAmount: 1, smoothing: 0.035, dim: 0 } as const
const REST_X = 0.72
const REST_Y = 0.42

export function RibbonField({ className = '', ...props }: RibbonFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useLatest({ ...DEFAULTS, ...props })

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined

    let mouseX = REST_X
    let mouseY = REST_Y
    let targetX = REST_X
    let targetY = REST_Y

    const loop = startShaderLoop(host, canvas, {
      vertex: RIBBON_FIELD_VERTEX_SHADER,
      fragment: RIBBON_FIELD_FRAGMENT_SHADER,
      onResize: (u, width, height) => u.f2('resolution', width, height),
      onFrame: (u, seconds) => {
        const options = optionsRef.current
        mouseX += (targetX - mouseX) * options.smoothing
        mouseY += (targetY - mouseY) * options.smoothing
        u.f('time', seconds * options.speed)
        u.f2('pointer', mouseX, mouseY)
        u.f('dim', options.dim)
      },
    })
    if (!loop) return undefined

    const onPointerMove = (event: PointerEvent) => {
      const amount = loop.reduced ? 0 : optionsRef.current.pointerAmount
      targetX = REST_X + (event.clientX / Math.max(window.innerWidth, 1) - REST_X) * amount
      targetY = REST_Y + (1 - event.clientY / Math.max(window.innerHeight, 1) - REST_Y) * amount
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      loop.dispose()
    }
  }, [optionsRef])

  return (
    <div ref={hostRef} className={`shader ribbon-field${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
