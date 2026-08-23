// Vendored from MengTo/threeui (src/shaders/liquid-form/LiquidFormBackground.tsx).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.
//
// Adapted: the blob looks toward the pointer anywhere on the page, not only
// while the pointer is over its own canvas.

import { useEffect, useRef } from 'react'
import { LIQUID_FORM_FRAGMENT_SHADER, LIQUID_FORM_VERTEX_SHADER } from './liquidFormShaders'
import { startShaderLoop } from './shaderLoop'
import { useLatest } from './useLatest'

export type LiquidFormProps = {
  speed?: number
  morph?: number
  noiseScale?: number
  /** How far the camera swings toward the pointer. */
  mouseAmount?: number
  metal?: number
  camera?: number
  /** Render only the form; pixels that miss it are see-through. */
  transparent?: boolean
  className?: string
}

const DEFAULTS = { speed: 1, morph: 1, noiseScale: 1, mouseAmount: 0.3, metal: 1, camera: 5.5 } as const

export function LiquidForm({ className = '', transparent = false, ...props }: LiquidFormProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useLatest({ ...DEFAULTS, ...props })

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined

    let targetX = 0
    let targetY = 0
    let mouseX = 0
    let mouseY = 0

    const loop = startShaderLoop(host, canvas, {
      vertex: LIQUID_FORM_VERTEX_SHADER,
      fragment: LIQUID_FORM_FRAGMENT_SHADER,
      attribute: 'a_pos',
      // 70-step raymarch per pixel: the most expensive shader on the page.
      dprCap: 1.5,
      alpha: transparent,
      onResize: (u, width, height) => u.f2('u_res', width, height),
      onFrame: (u, seconds) => {
        const options = optionsRef.current
        mouseX += (targetX - mouseX) * 0.05
        mouseY += (targetY - mouseY) * 0.05
        u.f('u_time', seconds * options.speed)
        u.f2('u_mouse', mouseX, mouseY)
        u.f('u_morph', options.morph)
        u.f('u_noise_scale', options.noiseScale)
        u.f('u_mouse_amount', options.mouseAmount)
        u.f('u_metal', options.metal)
        u.f('u_camera', options.camera)
        u.f('u_transparent', transparent ? 1 : 0)
      },
    })
    if (!loop) return undefined

    const onPointerMove = (event: PointerEvent) => {
      if (loop.reduced) return
      targetX = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1
      targetY = -((event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      loop.dispose()
    }
  }, [optionsRef, transparent])

  const classes = ['shader', 'liquid-form', transparent ? 'shader--transparent' : '', className].filter(Boolean).join(' ')
  return (
    <div ref={hostRef} className={classes} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
