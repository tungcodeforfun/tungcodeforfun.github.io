// Vendored from MengTo/threeui (src/shaders/bell-field/BellFieldBackground.tsx).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.
//
// Chladni-style nodal patterns on a WebGL canvas with a Canvas2D ember layer.
// A strike (periodic, or on pointer down) sends a ring out from the center.

import { useEffect, useRef } from 'react'
import { BELL_FIELD_FRAGMENT_SHADER, BELL_FIELD_VERTEX_SHADER } from './bellFieldShaders'
import { startShaderLoop } from './shaderLoop'
import { useLatest } from './useLatest'

export type BellFieldProps = {
  speed?: number
  pointerAmount?: number
  /** Milliseconds for a strike ring to fade. */
  strikeDuration?: number
  /** 0 to 1 share of the 58 embers drawn. */
  emberAmount?: number
  className?: string
}

type Ember = { x: number; y: number; r: number; vy: number; vx: number; ph: number; sp: number; hot: boolean }

const DEFAULTS = { speed: 1, pointerAmount: 1, strikeDuration: 2400, emberAmount: 1 } as const
const EMBER_COUNT = 58
const FIRST_STRIKE_MS = 1700
const STRIKE_EVERY_MS = 8200

function makeEmbers(): Ember[] {
  return Array.from({ length: EMBER_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.4 + Math.random() * 1.4,
    vy: -(0.1 + Math.random() * 0.26),
    vx: (Math.random() - 0.5) * 0.08,
    ph: Math.random() * Math.PI * 2,
    sp: 0.5 + Math.random() * 1.4,
    hot: Math.random() < 0.36,
  }))
}

export function BellField({ className = '', ...props }: BellFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const emberRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useLatest({ ...DEFAULTS, ...props })

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const emberCanvas = emberRef.current
    if (!host || !canvas || !emberCanvas) return undefined
    const embers2d = emberCanvas.getContext('2d')
    if (!embers2d) return undefined

    // CSS-pixel size of the host; embers and pointer live in this space.
    let width = 1
    let height = 1
    let dpr = 1
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0
    let lastStrikeMs = -1e9
    const embers = makeEmbers()
    let embersScaled = false

    const loop = startShaderLoop(host, canvas, {
      vertex: BELL_FIELD_VERTEX_SHADER,
      fragment: BELL_FIELD_FRAGMENT_SHADER,
      onResize: (u, backingWidth, backingHeight, ratio) => {
        dpr = ratio
        width = Math.max(1, backingWidth / dpr)
        height = Math.max(1, backingHeight / dpr)
        emberCanvas.width = backingWidth
        emberCanvas.height = backingHeight
        embers2d.setTransform(dpr, 0, 0, dpr, 0, 0)
        u.f2('u_resolution', backingWidth, backingHeight)
        if (!embersScaled) {
          mouseX = targetX = width * 0.5
          mouseY = targetY = height * 0.5
          for (const ember of embers) {
            ember.x *= width
            ember.y *= height
          }
          embersScaled = true
        }
      },
      onFrame: (u, seconds) => {
        const options = optionsRef.current
        const t = seconds * options.speed
        mouseX += (targetX - mouseX) * 0.04
        mouseY += (targetY - mouseY) * 0.04
        u.f('u_time', t)
        u.f('u_strike', Math.min(1, Math.max(0, (performance.now() - lastStrikeMs) / options.strikeDuration)))
        u.f2('u_mouse', mouseX * dpr, mouseY * dpr)

        embers2d.clearRect(0, 0, width, height)
        const count = Math.max(0, Math.min(EMBER_COUNT, Math.round(EMBER_COUNT * options.emberAmount)))
        for (let index = 0; index < count; index += 1) {
          const ember = embers[index]
          ember.y += ember.vy * options.speed
          ember.x += (ember.vx + Math.sin(t * ember.sp * 0.5 + ember.ph) * 0.13) * options.speed
          if (ember.y < -4) {
            ember.y = height + 4
            ember.x = Math.random() * width
          }
          if (ember.x < -4) ember.x = width + 4
          if (ember.x > width + 4) ember.x = -4
          const twinkle = 0.5 + 0.5 * Math.sin(t * ember.sp + ember.ph)
          embers2d.beginPath()
          embers2d.arc(ember.x, ember.y, ember.r, 0, Math.PI * 2)
          embers2d.fillStyle = ember.hot
            ? `rgba(231, 193, 101, ${0.06 + twinkle * 0.34})`
            : `rgba(143, 203, 185, ${0.04 + twinkle * 0.24})`
          embers2d.fill()
        }
      },
    })
    if (!loop) return undefined

    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect()
      const amount = loop.reduced ? 0 : optionsRef.current.pointerAmount
      targetX = width * 0.5 + (event.clientX - bounds.left - width * 0.5) * amount
      targetY = height * 0.5 + (event.clientY - bounds.top - height * 0.5) * amount
    }
    const strike = () => {
      lastStrikeMs = performance.now()
    }
    const firstStrike = window.setTimeout(strike, FIRST_STRIKE_MS)
    const strikeTimer = window.setInterval(strike, STRIKE_EVERY_MS)
    host.addEventListener('pointermove', onPointerMove, { passive: true })
    host.addEventListener('pointerdown', strike)
    return () => {
      window.clearTimeout(firstStrike)
      window.clearInterval(strikeTimer)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerdown', strike)
      loop.dispose()
    }
  }, [optionsRef])

  return (
    <div ref={hostRef} className={`shader bell-field${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      <canvas ref={emberRef} className="bell-field__embers" />
    </div>
  )
}
