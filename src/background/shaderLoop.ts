// Shared runtime for the vendored ThreeUI fragment shaders: context setup, a
// full-screen quad, resize with a DPR cap, a frame loop that pauses when the
// host is off-screen or the tab is hidden, reduced-motion slowdown, and
// WebGL context-loss recovery.

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/** Playback multiplier applied under prefers-reduced-motion. */
export const REDUCED_MOTION_SPEED = 0.3
const SMALL_SCREEN = 720
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export type Uniforms = {
  gl: WebGLRenderingContext
  f: (name: string, value: number) => void
  f2: (name: string, x: number, y: number) => void
}

export type ShaderLoopSpec = {
  vertex: string
  fragment: string
  /** Name of the vec2 position attribute in the vertex shader. Defaults to `position`. */
  attribute?: string
  /** Device pixel ratio cap. Small screens are capped at 1.5 regardless. */
  dprCap?: number
  /** Request an alpha channel; the fragment shader must then write premultiplied color. */
  alpha?: boolean
  /** Called after the viewport changes, with the backing-store size. */
  onResize?: (u: Uniforms, width: number, height: number, dpr: number) => void
  /** Called once per frame before the quad is drawn. `seconds` already includes the reduced-motion scale. */
  onFrame: (u: Uniforms, seconds: number, now: number) => void
}

export type ShaderLoop = {
  /** True when the viewer prefers reduced motion; components should ignore pointer input. */
  reduced: boolean
  dispose: () => void
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

/** Returns null when WebGL is unavailable; throws if the GPU rejects the program. */
export function startShaderLoop(host: HTMLElement, canvas: HTMLCanvasElement, spec: ShaderLoopSpec): ShaderLoop | null {
  const gl = canvas.getContext('webgl', { alpha: spec.alpha ?? false, premultipliedAlpha: true, antialias: false })
  if (!gl) return null

  const reduced = prefersReducedMotion()
  const speedScale = reduced ? REDUCED_MOTION_SPEED : 1
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let locations = new Map<string, WebGLUniformLocation | null>()
  let frame = 0
  let visible = true
  let lost = false
  const startedAt = performance.now()

  const location = (name: string) => {
    if (!locations.has(name)) locations.set(name, program ? gl.getUniformLocation(program, name) : null)
    return locations.get(name) ?? null
  }
  const uniforms: Uniforms = {
    gl,
    f: (name, value) => gl.uniform1f(location(name), value),
    f2: (name, x, y) => gl.uniform2f(location(name), x, y),
  }

  const resize = () => {
    const bounds = host.getBoundingClientRect()
    const cap = bounds.width < SMALL_SCREEN ? Math.min(spec.dprCap ?? 2, 1.5) : (spec.dprCap ?? 2)
    const dpr = Math.min(window.devicePixelRatio || 1, cap)
    canvas.width = Math.max(1, Math.floor(bounds.width * dpr))
    canvas.height = Math.max(1, Math.floor(bounds.height * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
    spec.onResize?.(uniforms, canvas.width, canvas.height, dpr)
  }

  const setup = () => {
    const vertex = compile(gl, gl.VERTEX_SHADER, spec.vertex)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, spec.fragment)
    program = gl.createProgram()
    if (!program) throw new Error('Unable to create program')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
    }
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, spec.attribute ?? 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    locations = new Map()
    resize()
  }

  const shouldRun = () => visible && !lost && !document.hidden
  const tick = (now: number) => {
    spec.onFrame(uniforms, (now - startedAt) * 0.001 * speedScale, now)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    frame = shouldRun() ? requestAnimationFrame(tick) : 0
  }
  const start = () => {
    if (!frame && shouldRun()) frame = requestAnimationFrame(tick)
  }
  const stop = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  const onVisibility = () => (document.hidden ? stop() : start())
  const onIntersect: IntersectionObserverCallback = ([entry]) => {
    visible = entry?.isIntersecting ?? true
    if (visible) start()
    else stop()
  }
  const onContextLost = (event: Event) => {
    event.preventDefault()
    lost = true
    stop()
  }
  const onContextRestored = () => {
    lost = false
    setup()
    start()
  }

  const resizeObserver = new ResizeObserver(resize)
  const intersection = new IntersectionObserver(onIntersect)
  resizeObserver.observe(host)
  intersection.observe(host)
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)

  setup()
  start()

  return {
    reduced,
    dispose: () => {
      stop()
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
