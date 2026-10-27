import { clearGrid, createGrid, Ink, put, type Grid } from './grid.ts'
import { createKoi, line, paintKoi, resizeKoi, swim, type Koi, type Look } from './koi.ts'
import { TAU, clamp, inside, random, smooth, wrap, type Rect } from './math.ts'

export type Layout = {
  width: number
  height: number
  cellW: number
  cellH: number
  keepOut: Rect | null
}

export type Pond = {
  setLayout(layout: Layout): void
  step(dt: number): void
  tap(x: number, y: number): void
  stir(x: number, y: number): void
  paint(): Grid
}

type Speck = { x: number; y: number; vx: number; vy: number; age: number; life: number; glyph: string }
type Mote = { x: number; y: number; age: number; life: number; glyph: string }
type Moment = { x: number; y: number; age: number }

const KOHAKU: Look = {
  body: Ink.White,
  patch: Ink.Red,
  fin: Ink.WhiteFin,
  eye: Ink.Eye,
  patches: [
    { along: 0.13, across: 0, alongRadius: 0.075, acrossRadius: 0.75 },
    { along: 0.37, across: 0.25, alongRadius: 0.11, acrossRadius: 0.9 },
    { along: 0.47, across: -0.55, alongRadius: 0.06, acrossRadius: 0.6 },
    { along: 0.63, across: 0.1, alongRadius: 0.07, acrossRadius: 0.8 },
  ],
}

const SUMI: Look = {
  body: Ink.Sumi,
  patch: Ink.Gold,
  fin: Ink.SumiFin,
  eye: Ink.Gold,
  patches: [
    { along: 0.1, across: 0, alongRadius: 0.09, acrossRadius: 1.1 },
    { along: 0.42, across: 0, alongRadius: 0.22, acrossRadius: 0.32 },
  ],
}

const WATER = '·˙·~'
const SIZES = [1, 0.94]
const LANES = [1.04, 0.84]
const WALL_PROBES = [0, 0.5]
const TEXT_PROBES = [0, 0.4, 0.8]
const RINGS = [
  [0, 1],
  [0.45, 0.55],
]

export function fishLength(width: number, height: number) {
  return Math.round(Math.min(width * 0.68, height * 0.5, 470))
}

export function metrics(width: number, height: number) {
  const fontSize = clamp(Math.round(fishLength(width, height) / 32), 8, 15)
  return { fontSize, cellW: (fontSize * 1233) / 2048, cellH: Math.round(fontSize * 1.1) }
}

export function createPond(): Pond {
  const rand = random(11)
  let layout: Layout = { width: 1, height: 1, cellW: 1, cellH: 1, keepOut: null }
  let grid: Grid = createGrid(1, 1, 1, 1)
  let koi: Koi[] = []
  let time = rand() * 1000
  let interest: Moment | null = null
  const glide = [0, 0]
  const nextGlide = [6 + rand() * 8, 10 + rand() * 8]
  const specks: Speck[] = []
  const ripples: Moment[] = []
  const motes: Mote[] = []
  const urge = { x: 0, y: 0, urgency: 0 }
  const home = { x: 0, y: 0, rx: 0, ry: 0 }
  const centre = { x: 0, y: 0, rx: 0, ry: 0 }
  const probe = { x: 0, y: 0 }

  function settle() {
    const { width, height, keepOut } = layout
    const top = keepOut ? keepOut.y : height
    const right = keepOut ? (width - keepOut.x - keepOut.w) * height : 0
    const share = right / (width * top + right || 1)
    home.x = width / 2 + share * (width - right / height) * 0.5
    home.y = (top / 2) * (1 - share) + (height / 2) * share
    home.rx = width * 0.18
    home.ry = (top * (1 - share) + height * share) * 0.27
  }

  function setLayout(next: Layout) {
    const sx = next.width / layout.width
    const sy = next.height / layout.height
    const steady = Math.abs(sx - 1) < 0.2 && Math.abs(sy - 1) < 0.2
    layout = next
    grid = createGrid(Math.ceil(next.width / next.cellW), Math.ceil(next.height / next.cellH), next.cellW, next.cellH)
    settle()
    const L = fishLength(next.width, next.height)
    if (koi.length) koi.forEach((k, i) => resizeKoi(k, L * SIZES[i], steady ? 1 : sx, steady ? 1 : sy))
    else koi = [createKoi(KOHAKU, L, home.x + home.rx, home.y, Math.PI / 2), createKoi(SUMI, L * SIZES[1], home.x - home.rx, home.y, -Math.PI / 2)]
    const count = Math.round((next.width * next.height) / 9000)
    specks.length = Math.min(specks.length, count)
    while (specks.length < count) specks.push(respawn({ x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, glyph: '' }, rand()))
  }

  function respawn(s: Speck, age: number) {
    const a = rand() * TAU
    const v = 1.5 + rand() * 4
    s.x = rand() * layout.width
    s.y = rand() * layout.height
    s.vx = Math.cos(a) * v + 2
    s.vy = Math.sin(a) * v * 0.5
    s.life = 7 + rand() * 9
    s.age = age * s.life
    s.glyph = WATER[Math.floor(rand() * WATER.length)]
    return s
  }

  function push(x: number, y: number, weight: number) {
    urge.x += x * weight
    urge.y += y * weight
  }

  function look(k: Koi, reach: number) {
    probe.x = k.x + Math.cos(k.heading) * k.length * reach
    probe.y = k.y + Math.sin(k.heading) * k.length * reach
  }

  function textGap(x: number, y: number) {
    const box = layout.keepOut
    return box ? Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h)) : Infinity
  }

  function circle(k: Koi, i: number) {
    const lane = (1 + 0.18 * Math.sin(time * 0.071 + i * 2.1)) * LANES[i]
    centre.x = home.x + home.rx * 0.25 * Math.sin(time * 0.043)
    centre.y = home.y + home.ry * 0.2 * Math.cos(time * 0.031)
    centre.rx = Math.max(k.length * 0.45, home.rx) * lane
    centre.ry = Math.max(k.length * 0.42, home.ry) * lane
    const qx = (k.x - centre.x) / centre.rx
    const qy = (k.y - centre.y) / centre.ry
    const tangent = Math.hypot(qy * centre.rx, qx * centre.ry) || 1
    const normal = Math.hypot(qx / centre.rx, qy / centre.ry) || 1
    const pull = clamp((1 - Math.hypot(qx, qy)) * 2.5, -2, 1.2)
    const wander = 0.32 * Math.sin(time * 0.17 + i * 3.7) + 0.18 * Math.sin(time * 0.41 + i)
    const dx = (-qy * centre.rx) / tangent + (qx / centre.rx / normal) * pull
    const dy = (qx * centre.ry) / tangent + (qy / centre.ry / normal) * pull
    urge.x = dx * Math.cos(wander) - dy * Math.sin(wander)
    urge.y = dx * Math.sin(wander) + dy * Math.cos(wander)
  }

  function giveRoom(k: Koi, other: Koi) {
    const room = k.length * 0.65
    const links = other.chain.length / 2 - 1
    for (let j = 0; j < 3; j++) {
      const at = Math.round((j * links) / 3)
      const dx = k.x - other.chain[at * 2]
      const dy = k.y - other.chain[at * 2 + 1]
      const d = Math.hypot(dx, dy) || 1
      if (d < room) push(dx / d, dy / d, ((room - d) / room) * 3)
    }
  }

  function curiosity(k: Koi) {
    if (!interest) return
    const dx = interest.x - k.x
    const dy = interest.y - k.y
    const d = Math.hypot(dx, dy) || 1
    const shy = smooth(textGap(k.x, k.y) / (k.length * 0.6))
    const pull = smooth(interest.age / 0.6) * (1 - smooth((interest.age - 4) / 3)) * shy
    push(dx / d, dy / d, pull * (d > k.length * 0.45 ? 4 : 0.5))
    urge.urgency = pull * 0.7
  }

  function stayIn(k: Koi) {
    const margin = k.length * 0.45
    const { width, height } = layout
    for (const reach of WALL_PROBES) {
      look(k, reach)
      const wx = clamp((margin - probe.x) / margin, 0, 2) - clamp((probe.x - width + margin) / margin, 0, 2)
      const wy = clamp((margin - probe.y) / margin, 0, 2) - clamp((probe.y - height + margin) / margin, 0, 2)
      push(wx, wy, 2.5)
      urge.urgency = Math.max(urge.urgency, Math.abs(wx) * 0.5, Math.abs(wy) * 0.5)
    }
  }

  function skirtText(k: Koi) {
    const box = layout.keepOut
    if (!box) return
    const room = k.length * 0.75
    for (const reach of TEXT_PROBES) {
      look(k, reach)
      const d = textGap(probe.x, probe.y)
      if (d >= room) continue
      const vx = probe.x - clamp(probe.x, box.x, box.x + box.w)
      const vy = probe.y - clamp(probe.y, box.y, box.y + box.h)
      const closeness = (room - d) / room
      push(d ? vx / d : 0, d ? vy / d : -1, closeness * (reach ? 4 : 6))
      urge.urgency = Math.max(urge.urgency, closeness)
    }
  }

  function pace(k: Koi, i: number, other: Koi, dt: number) {
    const ahead = wrap(Math.atan2(k.y - centre.y, k.x - centre.x) - Math.atan2(other.y - centre.y, other.x - centre.x))
    const cruise = k.length * 0.2 * (1 - 0.4 * clamp(wrap(ahead - Math.PI) / Math.PI, -1, 1))
    nextGlide[i] -= dt
    if (glide[i] > 0) glide[i] -= dt
    else if (nextGlide[i] <= 0) {
      glide[i] = 2.5 + rand() * 2.5
      nextGlide[i] = glide[i] + 9 + rand() * 12
    }
    const gliding = glide[i] > 0 && !(interest && interest.age < 4)
    const eager = interest ? 1 + 0.35 * (1 - smooth((interest.age - 3) / 3)) : 1
    swim(k, dt, Math.atan2(urge.y, urge.x), gliding ? cruise * 0.5 : cruise * eager, gliding, urge.urgency)
  }

  function step(dt: number) {
    time += dt
    for (let i = 0; i < koi.length; i++) {
      const k = koi[i]
      const other = koi[1 - i]
      urge.urgency = 0
      circle(k, i)
      giveRoom(k, other)
      curiosity(k)
      stayIn(k)
      skirtText(k)
      pace(k, i, other, dt)
    }
    if (interest && (interest.age += dt) > 7) interest = null
    for (const s of specks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      if ((s.age += dt) > s.life) respawn(s, 0)
    }
    for (let i = ripples.length - 1; i >= 0; i--) if ((ripples[i].age += dt) > 3.2) ripples.splice(i, 1)
    for (let i = motes.length - 1; i >= 0; i--) if ((motes[i].age += dt) > motes[i].life) motes.splice(i, 1)
  }

  function tap(x: number, y: number) {
    ripples.push({ x, y, age: 0 })
    interest = { x, y, age: 0 }
  }

  function stir(x: number, y: number) {
    if (motes.length > 40) motes.shift()
    motes.push({ x, y, age: 0, life: 1.4, glyph: rand() < 0.5 ? '·' : '˙' })
  }

  function mark(x: number, y: number, glyph: string, ink: number, alpha: number) {
    if (!inside(layout.keepOut, x, y)) put(grid, Math.floor(x / layout.cellW), Math.floor(y / layout.cellH), glyph, ink, alpha)
  }

  function ripple(rp: Moment) {
    for (const [delay, weight] of RINGS) {
      const t = rp.age - delay
      const alpha = Math.round(255 * weight * (1 - smooth(t / 2.6)))
      if (t <= 0 || alpha < 8) continue
      const radius = layout.cellW * (2 + t * 9)
      const steps = Math.max(8, Math.round((TAU * radius) / layout.cellW))
      for (let j = 0; j < steps; j++) {
        const a = (j / steps) * TAU
        const glyph = delay ? '·' : line(-Math.sin(a), Math.cos(a) * 0.82)
        mark(rp.x + Math.cos(a) * radius, rp.y + Math.sin(a) * radius * 0.82, glyph === '-' ? '~' : glyph, Ink.Ripple, alpha)
      }
    }
  }

  function paint() {
    clearGrid(grid)
    for (const s of specks) {
      const fade = Math.sin((s.age / s.life) * Math.PI)
      if (fade > 0.05) mark(s.x, s.y, s.glyph, Ink.Water, Math.round(255 * fade))
    }
    for (const m of motes) mark(m.x, m.y, m.glyph, Ink.Ripple, Math.round(160 * (1 - m.age / m.life)))
    for (const rp of ripples) ripple(rp)
    for (const k of koi) paintKoi(k, grid, layout.keepOut)
    return grid
  }

  return { setLayout, step, tap, stir, paint }
}
