import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three'
import { env, onEnvChange, remember, whenVisible } from '../env'
import { readPalette } from '../sim/draw'
import { spring, stepSpring } from '../spring'
import {
  backdropFragment,
  backdropVertex,
  endpointFragment,
  endpointVertex,
  lineFragment,
  lineVertex,
  plateFragment,
  plateVertex,
  sparkFragment,
  sparkVertex,
  WAVES,
} from './shaders'

const N = 3500
const R = 11
const INNER = 2.9
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const QUEUE_TOP = 3.3
const QUEUE_BOTTOM = 0.55
const QUEUE_STEP = 0.36
const SOURCE = new Vector3(0, 5.6, 0)
const DLQ = new Vector3(1.9, 0.04, 1.7)
const MAX_SPARKS = 96
const TRAIL = 14
const MAX_FLIGHTS = 32
const MAX_ATTEMPTS = 3
const STILL_AT = 9

type Msg = { y: number; poison: boolean; attempts: number; wait: number }
type Flight = {
  msg: Msg
  t: number
  dur: number
  from: Vector3
  ctrl: Vector3
  to: Vector3
  angle: number
  half: number
  radius: number
  failAt: number
  back: boolean
  dlq: boolean
  trail: Vector3[]
}
type Shot = { radius: number; polar: number; azimuth: number; target: Vector3 }

const WIDE: Shot = { radius: 24, polar: 1.04, azimuth: 0.42, target: new Vector3(0, 0.4, 0) }
const CLOSE: Shot = { radius: 10.5, polar: 1.1, azimuth: 0.92, target: new Vector3(0.7, 1.1, 0.6) }

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function circle(radius: number, segments = 64) {
  const pts: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const b = ((i + 1) / segments) * Math.PI * 2
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius, Math.cos(b) * radius, 0, Math.sin(b) * radius)
  }
  return pts
}

function lineMaterial(fog: Color) {
  return new ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    uniforms: { uFog: { value: fog }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
  })
}

function staticLines(points: number[], material: ShaderMaterial) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3))
  geometry.setAttribute('aColor', new BufferAttribute(new Float32Array((points.length / 3) * 4), 4))
  return new LineSegments(geometry, material)
}

function endpointsGeometry() {
  const random = seeded(3500)
  const positions = new Float32Array(N * 3)
  const seeds = new Float32Array(N)
  const angles = new Float32Array(N)
  const radii = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(INNER * INNER + ((R * R - INNER * INNER) * (i + 0.5)) / N)
    const a = (i * GOLDEN) % (Math.PI * 2)
    positions.set([Math.cos(a) * r, 0.012 * r * r - 0.25, Math.sin(a) * r], i * 3)
    seeds[i] = random()
    angles[i] = a
    radii[i] = r
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aAngle', new BufferAttribute(angles, 1))
  geometry.setAttribute('aRadius', new BufferAttribute(radii, 1))
  return geometry
}

function bezier(out: Vector3, a: Vector3, c: Vector3, b: Vector3, t: number) {
  const u = 1 - t
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  )
}

export function createHero(hero: HTMLElement, initialProgress: number) {
  const stage = hero.querySelector<HTMLElement>('.hero__stage')!
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  stage.querySelector('.hero__still')!.after(canvas)
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: env.still, powerPreference: 'high-performance' })
  } catch (error) {
    canvas.remove()
    remember('webgl', 'fail')
    throw error
  }
  canvas.addEventListener('webglcontextlost', () => {
    remember('webgl', 'fail')
    delete hero.dataset.live
    canvas.remove()
    running = false
  })

  const random = seeded(1027)
  const scene = new Scene()
  const camera = new PerspectiveCamera(34, 1, 0.1, 120)
  const fog = new Color()
  const colors = {
    base: new Color(),
    lit: new Color(),
    fail: new Color(),
    orange: new Color(),
    blue: new Color(),
    red: new Color(),
    top: new Color(),
    bottom: new Color(),
    glow: new Color(),
    plate: new Color(),
    rim: new Color(),
  }

  const backdrop = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      vertexShader: backdropVertex,
      fragmentShader: backdropFragment,
      uniforms: {
        uTop: { value: colors.top },
        uBottom: { value: colors.bottom },
        uGlow: { value: colors.glow },
        uCenter: { value: [0.62, 0.55] },
        uAspect: { value: 1.6 },
        uTime: { value: 0 },
        uCurtain: { value: 0 },
        uCurtainColor: { value: fog },
      },
      depthWrite: false,
      depthTest: false,
    }),
  )
  backdrop.frustumCulled = false
  backdrop.renderOrder = -10
  scene.add(backdrop)

  const plate = new Mesh(
    new CircleGeometry(R + 1.6, 96),
    new ShaderMaterial({
      vertexShader: plateVertex,
      fragmentShader: plateFragment,
      uniforms: { uColor: { value: colors.plate }, uRim: { value: colors.rim }, uRadius: { value: R + 1.6 } },
      transparent: true,
      depthWrite: false,
    }),
  )
  plate.rotation.x = -Math.PI / 2
  plate.position.y = -0.3
  plate.renderOrder = -5
  scene.add(plate)

  const waves = Array.from({ length: WAVES }, () => new Vector4(0, 0, -1, 0))
  let waveIndex = 0
  const pixelRatio = { value: 1 }
  const endpointUniforms = {
    uTime: { value: 0 },
    uSize: { value: 190 },
    uPixelRatio: pixelRatio,
    uWaves: { value: waves },
    uBase: { value: colors.base },
    uLit: { value: colors.lit },
    uFail: { value: colors.fail },
    uFog: { value: fog },
    uLight: { value: new Vector3(-0.45, 0.75, 0.55) },
    uHalo: { value: 0 },
    uAmbient: { value: 0.3 },
  }
  const endpointGeometry = endpointsGeometry()
  const endpoints = new Points(
    endpointGeometry,
    new ShaderMaterial({ vertexShader: endpointVertex, fragmentShader: endpointFragment, uniforms: endpointUniforms, transparent: true }),
  )
  scene.add(endpoints)
  const halos = new Points(
    endpointGeometry,
    new ShaderMaterial({
      vertexShader: endpointVertex,
      fragmentShader: endpointFragment,
      uniforms: { ...endpointUniforms, uHalo: { value: 1 } },
      transparent: true,
      depthWrite: false,
    }),
  )
  halos.renderOrder = 2
  scene.add(halos)

  const ringMaterial = lineMaterial(fog)
  const ringPoints: number[] = []
  for (let i = 0; i < 9; i++) {
    const y = QUEUE_BOTTOM - 0.12 + i * QUEUE_STEP
    ringPoints.push(...circle(0.42, 40).map((v, j) => (j % 3 === 1 ? y : v)))
  }
  ringPoints.push(0, QUEUE_TOP + 0.35, 0, 0, SOURCE.y - 0.3, 0)
  const ringColors: [number, number, number, number][] = []
  const rings = staticLines(ringPoints, ringMaterial)
  scene.add(rings)

  const dlqLines = staticLines([...circle(0.62, 56), ...circle(0.36, 40)], lineMaterial(fog))
  dlqLines.position.copy(DLQ)
  scene.add(dlqLines)

  const alerts = [0, 1, 2].map(() => {
    const ring = staticLines(circle(1, 72), lineMaterial(fog))
    ring.position.copy(DLQ)
    ring.visible = false
    scene.add(ring)
    return ring
  })

  const trailGeometry = new BufferGeometry()
  const trailPositions = new Float32Array(MAX_FLIGHTS * (TRAIL - 1) * 2 * 3)
  const trailColors = new Float32Array(MAX_FLIGHTS * (TRAIL - 1) * 2 * 4)
  trailGeometry.setAttribute('position', new BufferAttribute(trailPositions, 3))
  trailGeometry.setAttribute('aColor', new BufferAttribute(trailColors, 4))
  const trails = new LineSegments(trailGeometry, lineMaterial(fog))
  trails.frustumCulled = false
  trails.renderOrder = 3
  scene.add(trails)

  const sparkGeometry = new BufferGeometry()
  const sparkPositions = new Float32Array(MAX_SPARKS * 3)
  const sparkColors = new Float32Array(MAX_SPARKS * 3)
  const sparkSizes = new Float32Array(MAX_SPARKS)
  sparkGeometry.setAttribute('position', new BufferAttribute(sparkPositions, 3))
  sparkGeometry.setAttribute('color', new BufferAttribute(sparkColors, 3))
  sparkGeometry.setAttribute('aSize', new BufferAttribute(sparkSizes, 1))
  const sparks = new Points(
    sparkGeometry,
    new ShaderMaterial({
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      uniforms: { uPixelRatio: pixelRatio, uFog: { value: fog } },
      transparent: true,
      depthWrite: false,
    }),
  )
  sparks.frustumCulled = false
  sparks.renderOrder = 4
  scene.add(sparks)

  const queue: Msg[] = []
  const falling: Msg[] = []
  const flights: Flight[] = []
  let parked = 0
  let clock = 0
  let spawnClock = 0.2
  let launchClock = 0.6
  let poisonClock = 0.4
  let alert = -1
  let narrow = false

  function applyTheme() {
    const p = readPalette(hero)
    const dark = p.dark
    fog.set(p.bg)
    colors.bottom.set(p.bg)
    colors.top.set(p.bg).lerp(new Color(dark ? '#000000' : '#ffffff'), dark ? 0.35 : 0.5)
    colors.glow.set(p.bg).lerp(new Color(p.blue), dark ? 0.1 : 0.07)
    colors.base.set(dark ? '#6c7a92' : '#b4bcc8')
    endpointUniforms.uAmbient.value = dark ? 0.3 : 0.72
    colors.lit.set(p.blue)
    colors.fail.set(p.red)
    colors.orange.set(p.orange)
    colors.blue.set(p.blue)
    colors.red.set(p.red)
    colors.plate.set(p.bg).lerp(new Color(dark ? '#ffffff' : '#000000'), dark ? 0.05 : 0.04)
    colors.rim.set(p.blue).lerp(new Color(p.bg), 0.55)
    ringColors.length = 0
    const count = ringPoints.length / 3
    for (let i = 0; i < count; i++) {
      const tether = i >= count - 2
      ringColors.push([...(tether ? colors.blue : colors.orange).toArray(), tether ? 0.22 : 0.42] as [number, number, number, number])
    }
    setColors(rings, ringColors)
    setColors(dlqLines, [[...colors.red.toArray(), 0.75] as [number, number, number, number]])
    for (const a of alerts) setColors(a, [[...colors.red.toArray(), 1] as [number, number, number, number]])
  }

  function setColors(lines: LineSegments, rgba: [number, number, number, number][]) {
    const attr = lines.geometry.getAttribute('aColor') as BufferAttribute
    for (let i = 0; i < attr.count; i++) attr.array.set(rgba[Math.min(i, rgba.length - 1)], i * 4)
    attr.needsUpdate = true
  }

  function wave(f: Flight, fail: boolean) {
    waves[waveIndex].set(f.angle, fail ? f.half * 0.5 : f.half, clock, fail ? -f.radius : f.radius)
    waveIndex = (waveIndex + 1) % WAVES
  }

  function launch(msg: Msg) {
    if (flights.length >= MAX_FLIGHTS) {
      queue.unshift(msg)
      return
    }
    const angle = random() * Math.PI * 2
    const r = INNER + 1.2 + random() * (R - INNER - 2)
    const to = new Vector3(Math.cos(angle) * r, 0.012 * r * r - 0.2, Math.sin(angle) * r)
    const from = new Vector3(0, msg.y, 0)
    const ctrl = new Vector3(to.x * 0.45, 2.4 + r * 0.22, to.z * 0.45)
    const retry = !msg.poison && msg.attempts === 0 && random() < 0.11
    flights.push({
      msg,
      t: 0,
      dur: 1.2 + r * 0.05,
      from,
      ctrl,
      to,
      angle,
      half: (1.2 + random() * 1.6) / r,
      radius: r,
      failAt: msg.poison ? 0.42 : retry ? 0.62 : 2,
      back: false,
      dlq: false,
      trail: [],
    })
  }

  function fail(f: Flight, at: Vector3) {
    f.msg.attempts++
    wave(f, true)
    f.from = at.clone()
    f.t = 0
    if (f.msg.poison && f.msg.attempts >= MAX_ATTEMPTS) {
      f.dlq = true
      f.to = DLQ.clone().setY(DLQ.y + 0.1)
      f.ctrl = new Vector3((at.x + DLQ.x) / 2, Math.max(at.y, 1) + 1.6, (at.z + DLQ.z) / 2)
      f.dur = 1.3
      return
    }
    f.back = true
    f.to = new Vector3(0, QUEUE_BOTTOM + 0.2, 0)
    f.ctrl = new Vector3(at.x * 0.4, at.y + 1.4, at.z * 0.4)
    f.dur = 1.0
  }

  function land(f: Flight) {
    if (f.dlq) {
      parked = Math.min(5, parked + 1)
      alert = 0
      return
    }
    if (f.back) {
      f.msg.wait = 0.5
      f.msg.y = QUEUE_BOTTOM
      queue.unshift(f.msg)
      return
    }
    wave(f, false)
  }

  const scratch = new Vector3()

  function stepFlights(dt: number) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]
      const before = f.t
      f.t += dt / f.dur
      if (!f.back && !f.dlq && before < f.failAt && f.t >= f.failAt) {
        fail(f, bezier(scratch, f.from, f.ctrl, f.to, f.failAt))
        continue
      }
      const pos = bezier(new Vector3(), f.from, f.ctrl, f.to, Math.min(f.t, 1))
      f.trail.unshift(pos)
      if (f.trail.length > (narrow ? 8 : TRAIL)) f.trail.pop()
      if (f.t >= 1) {
        land(f)
        flights.splice(i, 1)
      }
    }
  }

  function stepQueue(dt: number, ambient: boolean) {
    spawnClock -= dt
    if (ambient && spawnClock <= 0) {
      spawnClock = narrow ? 0.6 : 0.36
      if (queue.length + falling.length < 9) falling.push({ y: SOURCE.y, poison: false, attempts: 0, wait: 0 })
    }
    poisonClock -= dt
    if (ambient && poisonClock <= 0) {
      poisonClock = 17
      queue.unshift({ y: QUEUE_BOTTOM + 0.4, poison: true, attempts: 0, wait: 0 })
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const m = falling[i]
      m.y -= dt * 2.6
      const floor = QUEUE_BOTTOM + queue.length * QUEUE_STEP
      if (m.y <= Math.max(floor, QUEUE_BOTTOM)) {
        falling.splice(i, 1)
        queue.push(m)
      }
    }
    queue.forEach((m, i) => {
      const target = QUEUE_BOTTOM + i * QUEUE_STEP
      m.y += (target - m.y) * (1 - Math.exp(-dt * 6))
      m.wait = Math.max(0, m.wait - dt)
    })
    launchClock -= dt
    const head = queue[0]
    if (launchClock <= 0 && head && head.wait <= 0 && head.y < QUEUE_BOTTOM + 0.08) {
      launchClock = narrow ? 0.5 : 0.3
      launch(queue.shift()!)
    }
  }

  function step(dt: number, ambient: boolean) {
    clock += dt
    stepQueue(dt, ambient)
    stepFlights(dt)
    if (alert >= 0) {
      alert += dt
      if (alert > 3.2) alert = -1
    }
  }

  function writeSpark(i: number, pos: Vector3, color: Color, size: number) {
    if (i >= MAX_SPARKS) return i
    sparkPositions.set([pos.x, pos.y, pos.z], i * 3)
    sparkColors.set([color.r, color.g, color.b], i * 3)
    sparkSizes[i] = size
    return i + 1
  }

  function msgColor(m: Msg) {
    return m.poison && m.attempts > 0 ? colors.red : colors.blue
  }

  function syncSparks() {
    let i = writeSpark(0, SOURCE, colors.blue, 110)
    for (const m of queue) i = writeSpark(i, scratch.set(0, m.y, 0), msgColor(m), 70)
    for (const m of falling) i = writeSpark(i, scratch.set(0, m.y, 0), colors.blue, 62)
    for (const f of flights) if (f.trail[0]) i = writeSpark(i, f.trail[0], f.back || f.dlq ? colors.red : msgColor(f.msg), 78)
    for (let k = 0; k < parked; k++) {
      i = writeSpark(i, scratch.set(DLQ.x + Math.cos(k * 2.1) * 0.22, DLQ.y + 0.12, DLQ.z + Math.sin(k * 2.1) * 0.22), colors.red, 64)
    }
    sparkGeometry.setDrawRange(0, i)
    for (const key of ['position', 'color', 'aSize']) sparkGeometry.getAttribute(key).needsUpdate = true
  }

  function syncTrails() {
    let v = 0
    for (const f of flights) {
      const color = f.back || f.dlq ? colors.red : colors.blue
      for (let k = 0; k < f.trail.length - 1; k++) {
        const a = 0.55 * (1 - k / f.trail.length)
        const b = 0.55 * (1 - (k + 1) / f.trail.length)
        trailPositions.set([f.trail[k].x, f.trail[k].y, f.trail[k].z, f.trail[k + 1].x, f.trail[k + 1].y, f.trail[k + 1].z], v * 3)
        trailColors.set([color.r, color.g, color.b, a, color.r, color.g, color.b, b], v * 4)
        v += 2
      }
    }
    trailGeometry.setDrawRange(0, v)
    trailGeometry.getAttribute('position').needsUpdate = true
    trailGeometry.getAttribute('aColor').needsUpdate = true
  }

  function syncAlerts() {
    alerts.forEach((ring, k) => {
      const t = alert - k * 0.45
      ring.visible = alert >= 0 && t > 0 && t < 2.2
      if (!ring.visible) return
      const e = t / 2.2
      ring.scale.setScalar(0.6 + e * 3.4)
      ;(ring.material as ShaderMaterial).uniforms.uOpacity.value = (1 - e) * 0.9
    })
  }

  const pointer = { x: spring(0), y: spring(0) }
  const progress = spring(initialProgress)
  let target = initialProgress
  let curtain = 0
  let shotIndex = initialProgress >= 0.5 ? 1 : 0

  function placeCamera(dt: number) {
    if (env.reduced) {
      const wanted = target >= 0.5 ? 1 : 0
      if (wanted !== shotIndex) {
        curtain = Math.min(1, curtain + dt * 6)
        if (curtain >= 1) shotIndex = wanted
      } else curtain = Math.max(0, curtain - dt * 4)
      progress.value = shotIndex
      progress.velocity = 0
    } else {
      curtain = 0
      progress.target = target
      stepSpring(progress, dt, 60, 16)
    }
    stepSpring(pointer.x, dt, 40, 12)
    stepSpring(pointer.y, dt, 40, 12)
    const p = Math.min(1, Math.max(0, progress.value))
    const e = p * p * (3 - 2 * p)
    const drift = env.reduced ? 0 : Math.sin(clock * 0.06) * 0.05
    const azimuth = WIDE.azimuth + (CLOSE.azimuth - WIDE.azimuth) * e + pointer.x.value * 0.07 + drift
    const polar = WIDE.polar + (CLOSE.polar - WIDE.polar) * e + pointer.y.value * 0.04
    const radius = (WIDE.radius + (CLOSE.radius - WIDE.radius) * e) * (narrow ? 1.35 : 1)
    const look = scratch.copy(WIDE.target).lerp(CLOSE.target, e)
    camera.position.set(
      look.x + radius * Math.sin(polar) * Math.sin(azimuth),
      look.y + radius * Math.cos(polar),
      look.z + radius * Math.sin(polar) * Math.cos(azimuth),
    )
    camera.lookAt(look)
    ;(backdrop.material as ShaderMaterial).uniforms.uCurtain.value = curtain
  }

  function resize() {
    const box = stage.getBoundingClientRect()
    const w = Math.max(1, box.width)
    const h = Math.max(1, box.height)
    narrow = w < 720
    const dpr = Math.min(devicePixelRatio || 1, narrow ? 1.5 : 1.75)
    pixelRatio.value = dpr * (h / 900)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    if (narrow) camera.setViewOffset(w, h * 1.3, 0, h * 0.3, w, h)
    else camera.setViewOffset(w * 1.5, h, 0, 0, w, h)
    camera.fov = narrow ? 44 : 34
    camera.updateProjectionMatrix()
    const bu = (backdrop.material as ShaderMaterial).uniforms
    bu.uAspect.value = w / h
    bu.uCenter.value = narrow ? [0.5, 0.7] : [0.68, 0.55]
    halos.visible = !narrow
  }

  function render() {
    endpointUniforms.uTime.value = clock
    ;(backdrop.material as ShaderMaterial).uniforms.uTime.value = clock
    syncSparks()
    syncTrails()
    syncAlerts()
    renderer.render(scene, camera)
  }

  applyTheme()
  resize()
  let running = false
  new ResizeObserver(() => {
    resize()
    if (!running) render()
  }).observe(stage)

  if (env.still) {
    for (let t = 0; t < STILL_AT; t += 1 / 60) step(1 / 60, true)
    placeCamera(0)
    render()
    hero.dataset.stillReady = ''
    return { progress() {} }
  }

  let visible = true
  let raf = 0
  let last = 0
  let dirty = true

  const frame = (now: number) => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30))
    last = now
    if (!env.paused) step(dt * (env.reduced ? 0.35 : 1), true)
    placeCamera(dt)
    render()
    dirty = false
    if (!hero.dataset.live) hero.dataset.live = ''
    const moving = !env.paused || Math.abs(progress.target - progress.value) > 1e-3 || curtain > 0
    raf = moving ? requestAnimationFrame(frame) : 0
  }
  const wake = () => {
    if (!running || !visible || document.hidden || raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  const sleep = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  running = true
  whenVisible(stage, (v) => {
    visible = v
    if (v) wake()
    else sleep()
  })
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()))
  onEnvChange(() => {
    applyTheme()
    dirty = true
    wake()
  })
  hero.addEventListener('pointermove', (e) => {
    if (env.reduced || e.pointerType !== 'mouse') return
    const box = stage.getBoundingClientRect()
    pointer.x.target = ((e.clientX - box.left) / box.width) * 2 - 1
    pointer.y.target = ((e.clientY - box.top) / box.height) * 2 - 1
    wake()
  })
  wake()

  return {
    progress(p: number) {
      target = p
      if (dirty || Math.abs(p - progress.value) > 1e-3) wake()
    },
  }
}
