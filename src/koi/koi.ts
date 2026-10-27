import { put, type Grid, type InkId } from './grid.ts'
import { TAU, clamp, clear, ease, inside, smooth, wrap, type Rect } from './math.ts'

export type Patch = { along: number; across: number; alongRadius: number; acrossRadius: number }
export type Look = { body: InkId; patch: InkId; fin: InkId; eye: InkId; patches: readonly Patch[] }
export type Water = { width: number; height: number; fence: Rect | null }

export type Koi = {
  look: Look
  length: number
  x: number
  y: number
  heading: number
  speed: number
  turn: number
  bank: number
  phase: number
  effort: number
  scull: number
  chain: Float64Array
  pressed: boolean
}

const N = 30
const HEAD = 0.26
const TAIL = 0.79
const WIDTH = 0.118
const WAIST = 0.26
const FAN = 0.12
const BEND = 0.5

const qx = new Float64Array(N + 1)
const qy = new Float64Array(N + 1)
const sx = new Float64Array(N)
const sy = new Float64Array(N)
const sl = new Float64Array(N)
const hit = { s: 0, d: 0, tx: 1, ty: 0, ex: 0, ey: 0 }
const at = { x: 0, y: 0 }
const held = { x: 0, y: 0 }
const root = { x: 0, y: 0 }
const norm = { x: 0, y: 0, g: 1 }
const span = { c0: 0, c1: 0, r0: 0, r1: 0 }
const SIDES = [-1, 1]
let target: Grid
let clip: Rect | null = null

export function createKoi(look: Look, length: number, x: number, y: number, heading: number): Koi {
  const chain = new Float64Array((N + 1) * 2)
  for (let i = 0; i <= N; i++) {
    chain[i * 2] = x - Math.cos(heading) * (length / N) * i
    chain[i * 2 + 1] = y - Math.sin(heading) * (length / N) * i
  }
  return { look, length, x, y, heading, speed: 0, turn: 0, bank: 0, phase: 0, effort: 1, scull: 0, chain, pressed: false }
}

export function resizeKoi(koi: Koi, length: number, scaleX: number, scaleY: number) {
  const c = koi.chain
  for (let i = 0; i <= N; i++) {
    c[i * 2] *= scaleX
    c[i * 2 + 1] *= scaleY
  }
  koi.x = c[0]
  koi.y = c[1]
  koi.speed *= length / koi.length
  koi.length = length
}

export function swim(koi: Koi, dt: number, heading: number, speed: number, gliding: boolean, urgency: number, water: Water) {
  const L = koi.length
  const agility = (Math.max(koi.speed, L * 0.08) / (L * BEND)) * (1 + 1.5 * urgency)
  const delta = wrap(heading - koi.heading)
  const behind = koi.pressed && Math.abs(delta) > 2.6 && koi.turn * delta < 0
  const want = clamp((behind ? delta - Math.sign(delta) * TAU : delta) * 1.2, -agility, agility)
  koi.turn += (want - koi.turn) * ease(1.8, dt)
  koi.heading = wrap(koi.heading + koi.turn * dt)
  koi.speed += (speed - koi.speed) * ease(gliding ? 0.25 : 0.8, dt)
  koi.x += Math.cos(koi.heading) * koi.speed * dt
  koi.y += Math.sin(koi.heading) * koi.speed * dt
  const curl = clamp((koi.turn * L * BEND) / Math.max(koi.speed, 1), -1, 1)
  koi.bank += (curl - koi.bank) * ease(2.5, dt)
  koi.effort += ((gliding ? 0.15 : 1) - koi.effort) * ease(1.1, dt)
  koi.phase += TAU * (0.2 + (1.6 * koi.speed) / L) * (0.3 + 0.7 * koi.effort) * dt
  koi.scull += TAU * (0.3 + 0.35 * Math.abs(koi.bank) + 0.2 * koi.effort) * dt
  const c = koi.chain
  const link = L / N
  c[0] = koi.x
  c[1] = koi.y
  koi.pressed = hold(c, 0, L, water)
  for (let i = 1; i <= N; i++) {
    const dx = c[i * 2] - c[i * 2 - 2]
    const dy = c[i * 2 + 1] - c[i * 2 - 1]
    const m = Math.hypot(dx, dy) || 1
    c[i * 2] = c[i * 2 - 2] + (dx / m) * link
    c[i * 2 + 1] = c[i * 2 - 1] + (dy / m) * link
    hold(c, i, L, water)
  }
  koi.x = c[0]
  koi.y = c[1]
}

function hold(c: Float64Array, i: number, L: number, water: Water) {
  const s = i / N
  const m = L * (0.03 + (s < TAIL ? halfWidth(s) : fanWidth((s - TAIL) / (1 - TAIL))))
  held.x = clamp(c[i * 2], m, water.width - m)
  held.y = clamp(c[i * 2 + 1], m, water.height - m)
  if (water.fence) clear(water.fence, held, m)
  const moved = held.x !== c[i * 2] || held.y !== c[i * 2 + 1]
  c[i * 2] = held.x
  c[i * 2 + 1] = held.y
  return moved
}

function halfWidth(s: number) {
  if (s <= 0) return 0
  if (s < HEAD) return WIDTH * Math.sqrt(1 - Math.pow((HEAD - s) / HEAD, 2.2))
  return WIDTH * (1 - (1 - WAIST) * smooth((s - HEAD) / (TAIL - HEAD)))
}

function fanWidth(f: number) {
  return WIDTH * WAIST + FAN * Math.sin(Math.min(1, f * 1.1) * Math.PI * 0.5)
}

function spine(koi: Koi) {
  const c = koi.chain
  const L = koi.length
  const reach = L * 0.07 * (0.3 + 0.7 * koi.effort)
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const a = Math.max(0, i - 1)
    const b = Math.min(N, i + 1)
    const tx = c[b * 2] - c[a * 2]
    const ty = c[b * 2 + 1] - c[a * 2 + 1]
    const m = Math.hypot(tx, ty) || 1
    const wave = reach * (0.02 + s * s * 1.1) * Math.sin(TAU * 0.75 * s - koi.phase)
    qx[i] = c[i * 2] - (ty / m) * wave
    qy[i] = c[i * 2 + 1] + (tx / m) * wave
  }
  for (let i = 0; i < N; i++) {
    const dx = qx[i + 1] - qx[i]
    const dy = qy[i + 1] - qy[i]
    const m = Math.hypot(dx, dy) || 1e-6
    sx[i] = dx / m
    sy[i] = dy / m
    sl[i] = m
  }
}

function locate(px: number, py: number) {
  let best = Infinity
  for (let i = 0; i < N; i++) {
    const ax = px - qx[i]
    const ay = py - qy[i]
    const t = clamp((ax * sx[i] + ay * sy[i]) / sl[i], 0, i === N - 1 ? Infinity : 1)
    const ex = ax - sx[i] * t * sl[i]
    const ey = ay - sy[i] * t * sl[i]
    const d2 = ex * ex + ey * ey
    if (d2 < best) {
      best = d2
      hit.s = (i + t) / N
      hit.tx = sx[i]
      hit.ty = sy[i]
      hit.ex = ex
      hit.ey = ey
      hit.d = (ey * sx[i] - ex * sy[i] >= 0 ? 1 : -1) * Math.sqrt(d2)
    }
  }
}

function point(s: number, side: number) {
  const f = clamp(s, 0, 1) * N
  const i = Math.min(N - 1, Math.floor(f))
  const t = f - i
  at.x = qx[i] + (qx[i + 1] - qx[i]) * t - sy[i] * side
  at.y = qy[i] + (qy[i + 1] - qy[i]) * t + sx[i] * side
  return i
}

export function line(dx: number, dy: number) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ay < ax * 0.4) return '-'
  if (ay > ax * 2.6) return '|'
  return dx > 0 === dy > 0 ? '\\' : '/'
}

function edge(nx: number, ny: number, sd: number, cellH: number) {
  if (Math.abs(ny) > 0.74) {
    const t = (-sd * ny) / cellH
    return t > 0.22 ? '_' : t > 0.06 ? '.' : t > -0.12 ? '-' : t > -0.3 ? "'" : '`'
  }
  if (Math.abs(nx) > 0.92) return nx > 0 ? ')' : '('
  return nx > 0 === ny > 0 ? '/' : '\\'
}

function scale(tx: number, ty: number, flip: boolean) {
  if (Math.abs(tx) * 1.3 >= Math.abs(ty)) return tx < 0 ? '(' : ')'
  return ty < 0 !== flip ? '⌒' : '‿'
}

function inPatch(look: Look, s: number, u: number) {
  for (const p of look.patches) {
    const a = (s - p.along) / p.alongRadius
    const b = (u - p.across) / p.acrossRadius
    const wobble = 0.22 * Math.sin(s * 41 + u * 3.1 + p.along * 17) + 0.12 * Math.sin(u * 9 - s * 23)
    if (a * a + b * b < 1 + wobble) return true
  }
  return false
}

function cells(x0: number, y0: number, x1: number, y1: number) {
  span.c0 = Math.max(0, Math.floor(x0 / target.cellW))
  span.c1 = Math.min(target.cols - 1, Math.ceil(x1 / target.cellW))
  span.r0 = Math.max(0, Math.floor(y0 / target.cellH))
  span.r1 = Math.min(target.rows - 1, Math.ceil(y1 / target.cellH))
}

function band(nx: number, ny: number) {
  return 0.5 * (Math.abs(nx) * target.cellW + Math.abs(ny) * target.cellH)
}

function membrane(v: number, rays: number, gap: number, cell: number) {
  const k = ((v + 1) / 2) * rays
  return Math.abs(k - Math.round(k)) * gap < cell * 0.55 ? 165 : 60
}

function fin(koi: Koi, s: number, side: number, angle: number, size: number, spread: number) {
  const i = point(s, side * koi.length * halfWidth(s) * 0.92)
  const rx = at.x
  const ry = at.y
  const ax = sx[i] * Math.cos(angle) - sy[i] * side * Math.sin(angle)
  const ay = sy[i] * Math.cos(angle) + sx[i] * side * Math.sin(angle)
  const len = koi.length * size
  const { cellW, cellH } = target
  cells(rx - len, ry - len, rx + len, ry + len)
  const { c0, c1, r0, r1 } = span
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const px = (c + 0.5) * cellW
      const py = (r + 0.5) * cellH
      const vx = px - rx
      const vy = py - ry
      const dist = Math.hypot(vx, vy)
      const lean = Math.atan2((ax * vy - ay * vx) * side, ax * vx + ay * vy) + spread * 0.25
      if (dist < cellW * 0.5 || Math.abs(lean) > spread || inside(clip, px, py)) continue
      const sd = dist - len * Math.pow(Math.cos((lean / spread) * Math.PI * 0.5), 0.35)
      const edgeBand = band(vx / dist, vy / dist)
      if (sd > edgeBand) continue
      const rim = sd > -edgeBand
      const glyph = rim ? edge(vx / dist, vy / dist, sd, cellH) : line(vx, vy)
      put(target, c, r, glyph, koi.look.fin, rim ? 190 : membrane(lean / spread, 4, ((2 * spread) / 4) * dist, cellW))
    }
  }
}

function tail(koi: Koi, c: number, r: number, px: number, py: number) {
  const f = (hit.s - TAIL) / (1 - TAIL)
  const tw = koi.length * fanWidth(f)
  const side = hit.d >= 0 ? 1 : -1
  const u = Math.min(1, Math.abs(hit.d) / tw)
  const lateral = Math.abs(hit.d) - tw
  const trailing = (f - 1 + 0.32 * Math.pow(1 - u, 1.6) + 0.06 * u * u) * (1 - TAIL) * koi.length
  const sides = lateral > trailing
  const sd = Math.max(lateral, trailing)
  const edgeBand = sides ? band(-hit.ty * side, hit.tx * side) : band(hit.tx, hit.ty)
  if (sd > edgeBand) return
  const ray = line(px - root.x, py - root.y)
  if (sd > -edgeBand) put(target, c, r, sides ? ray : edge(hit.tx, hit.ty, sd, target.cellH), koi.look.fin, 190)
  else put(target, c, r, ray, koi.look.fin, membrane(hit.d / tw, 6, (2 * tw) / 6, (target.cellW + target.cellH) / 2))
}

function surface(s: number, side: number) {
  if (s <= 0) {
    norm.g = 1
    norm.x = hit.ex
    norm.y = hit.ey
  } else {
    const k = clamp((halfWidth(s + 0.004) - halfWidth(s - 0.004)) / 0.008, -6, 6)
    norm.x = -hit.ty * side - k * hit.tx
    norm.y = hit.tx * side - k * hit.ty
    norm.g = Math.hypot(norm.x, norm.y)
  }
  const m = Math.hypot(norm.x, norm.y) || 1
  norm.x /= m
  norm.y /= m
}

function skin(koi: Koi, c: number, r: number, narrow: number) {
  const s = hit.s
  const w = koi.length * halfWidth(s) * narrow
  surface(s, hit.d >= 0 ? 1 : -1)
  const sd = (Math.abs(hit.d) - w) / norm.g
  const edgeBand = band(norm.x, norm.y)
  if (sd > edgeBand) return
  const u = w > 0 ? hit.d / w : 0
  const ink = inPatch(koi.look, s, u) ? koi.look.patch : koi.look.body
  if (sd > -edgeBand) put(target, c, r, edge(norm.x, norm.y, sd, target.cellH), ink)
  else put(target, c, r, s < HEAD * 0.75 ? ':' : scale(hit.tx, hit.ty, ((c + r) & 1) === 1), ink, Math.round(255 * (0.55 + 0.45 * (1 - u * u))))
}

function bounds(pad: number) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i <= N; i++) {
    minX = Math.min(minX, qx[i])
    maxX = Math.max(maxX, qx[i])
    minY = Math.min(minY, qy[i])
    maxY = Math.max(maxY, qy[i])
  }
  cells(minX - pad, minY - pad, maxX + pad, maxY + pad)
}

export function paintKoi(koi: Koi, grid: Grid, keepOut: Rect | null) {
  target = grid
  clip = keepOut
  spine(koi)
  const L = koi.length
  for (const side of SIDES) {
    const flare = Math.max(0, -side * koi.bank)
    fin(koi, 0.25, side, 0.9 + 0.2 * Math.sin(koi.scull + side * 0.8) + 0.4 * flare, 0.18, 0.6)
    fin(koi, 0.53, side, 0.7 + 0.12 * Math.sin(koi.scull * 0.8 + side), 0.085, 0.45)
  }
  const narrow = 1 - 0.1 * Math.abs(koi.bank)
  point(TAIL, 0)
  root.x = at.x
  root.y = at.y
  bounds(L * (WIDTH * WAIST + FAN))
  const { c0, c1, r0, r1 } = span
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const px = (c + 0.5) * grid.cellW
      const py = (r + 0.5) * grid.cellH
      if (inside(clip, px, py)) continue
      locate(px, py)
      if (hit.s >= TAIL) tail(koi, c, r, px, py)
      else skin(koi, c, r, narrow)
    }
  }
  for (const side of SIDES) {
    point(0.08, side * L * halfWidth(0.08) * 0.62)
    if (!inside(clip, at.x, at.y)) put(grid, Math.floor(at.x / grid.cellW), Math.floor(at.y / grid.cellH), 'o', koi.look.eye)
  }
}
