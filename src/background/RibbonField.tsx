// Vendored from MengTo/threeui (src/shaders/ribbon-field/RibbonFieldBackground.tsx).
// MIT License, Copyright (c) 2026 Meng To. See THIRD_PARTY_NOTICES.md.
//
// Adapted for this site:
// - pointer is read from `window`, so page content layered on top keeps the parallax
// - `dim` prop fades the ribbons (used as the hero scrolls out of view)
// - `prefers-reduced-motion` slows playback and disables pointer parallax (ambient, low-contrast
//   motion stays; anything interaction-driven stops)
// - pauses on tab hide and recovers from WebGL context loss
// - device pixel ratio capped lower on small screens

import { useEffect, useRef, useState } from 'react'
import { RIBBON_FIELD_FRAGMENT_SHADER, RIBBON_FIELD_VERTEX_SHADER } from './ribbonFieldShaders'

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
const SMALL_SCREEN = 720
/** Playback multiplier applied under prefers-reduced-motion. */
export const REDUCED_MOTION_SPEED = 0.3

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed')
  }
  return shader
}

export function RibbonField({ className = '', ...props }: RibbonFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useRef({ ...DEFAULTS, ...props })
  optionsRef.current = { ...DEFAULTS, ...props }
  // Bumped when the WebGL context is restored so the effect rebuilds the program.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return undefined

    const vertex = compile(gl, gl.VERTEX_SHADER, RIBBON_FIELD_VERTEX_SHADER)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, RIBBON_FIELD_FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!program) return undefined
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'resolution')
    const uTime = gl.getUniformLocation(program, 'time')
    const uPointer = gl.getUniformLocation(program, 'pointer')
    const uDim = gl.getUniformLocation(program, 'dim')

    const reduced = prefersReducedMotion()
    let mouseX = REST_X
    let mouseY = REST_Y
    let targetX = REST_X
    let targetY = REST_Y
    let frame = 0
    let visible = true
    const startedAt = performance.now()

    const onPointerMove = (event: PointerEvent) => {
      const amount = reduced ? 0 : optionsRef.current.pointerAmount
      targetX = REST_X + (event.clientX / Math.max(window.innerWidth, 1) - REST_X) * amount
      targetY = REST_Y + (1 - event.clientY / Math.max(window.innerHeight, 1) - REST_Y) * amount
    }

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      const cap = bounds.width < SMALL_SCREEN ? 1.5 : 2
      const ratio = Math.min(window.devicePixelRatio || 1, cap)
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio))
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
    }

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds)
      gl.uniform2f(uPointer, mouseX, mouseY)
      gl.uniform1f(uDim, optionsRef.current.dim)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const shouldRun = () => visible && !document.hidden
    const speedScale = reduced ? REDUCED_MOTION_SPEED : 1

    const tick = (now: number) => {
      const options = optionsRef.current
      mouseX += (targetX - mouseX) * options.smoothing
      mouseY += (targetY - mouseY) * options.smoothing
      draw((now - startedAt) * 0.001 * options.speed * speedScale)
      frame = shouldRun() ? requestAnimationFrame(tick) : 0
    }

    const start = () => {
      if (!frame && shouldRun()) frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    const onResize = () => resize()
    const onVisibility = () => (document.hidden ? stop() : start())
    const onIntersect: IntersectionObserverCallback = ([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) start()
      else stop()
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      stop()
    }
    const onContextRestored = () => setGeneration((value) => value + 1)

    const resizeObserver = new ResizeObserver(onResize)
    const intersection = new IntersectionObserver(onIntersect)
    resizeObserver.observe(host)
    intersection.observe(host)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    resize()
    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersection.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      gl.deleteBuffer(buffer)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteProgram(program)
    }
  }, [generation])

  return (
    <div ref={hostRef} className={`ribbon-field${className ? ` ${className}` : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
