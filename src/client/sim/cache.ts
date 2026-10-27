import type { Palette } from '../palette'
import { spring, stepSpring } from '../spring'
import { alpha, ball, FONT, glow, label, mix, pill, tabular } from './draw'
import { mountSim, type Sim, type SimApi } from './stage'

type Kind = 'hit' | 'miss' | 'wait' | 'db'
type Node = 'client' | 'api' | 'key' | 'db' | 'wait'
type Phase = 'in' | 'ask' | 'toWait' | 'waiting' | 'toDb' | 'read' | 'fill' | 'back' | 'direct' | 'readDirect' | 'dbBack' | 'out'
type Req = {
  id: number
  client: number
  key: number
  phase: Phase
  from: Node
  to: Node
  t: number
  dur: number
  ms: number
  kind: Kind
  slot: number
  waitFrac: number
}
type Key = { ttl: number; life: number; holder: Req | null; fillMs: number; lockT: number; lockDur: number; waiters: Req[]; flash: number }
type Point = { x: number; y: number }
type Rect = { x0: number; y0: number; x1: number; y1: number }
type Layout = {
  portrait: boolean
  vpcA: Rect
  vpcB: Rect
  clients: Point[]
  api: Point
  db: Point
  cache: Rect
  keys: Point[]
  chart: Rect
}

const KEYS = 6
const WEIGHTS = [0.3, 0.22, 0.17, 0.13, 0.1, 0.08]
const RATE = 18
const WINDOW = 200
const CAP = 512
const SPAN = 12
const MAX_MS = 260
const GRID = [10, 50, 100, 200]
const LEG = { in: 0.3, ask: 0.26, back: 0.26, out: 0.3, db: 0.38, direct: 0.3, toWait: 0.2 }
const fmt = (n: number) => n.toLocaleString('en-US')

function layout(w: number, h: number): Layout {
  const portrait = h > w * 0.95
  const top = portrait ? 54 : 58
  const bottom = h * (portrait ? 0.52 : 0.51)
  const mid = (top + bottom) / 2
  const pad = portrait ? 12 : 18
  const split = w * (portrait ? 0.635 : 0.62)
  const vpcA = { x0: pad, y0: top, x1: split - 6, y1: bottom }
  const vpcB = { x0: split + 6, y0: top, x1: w - pad, y1: bottom }
  const n = portrait ? 4 : 5
  const cy0 = top + (portrait ? 40 : 50)
  const cy1 = bottom - (portrait ? 22 : 36)
  const clients = Array.from({ length: n }, (_, i) => ({ x: pad + (portrait ? 24 : 46), y: cy0 + ((cy1 - cy0) * i) / (n - 1) }))
  const cx = (vpcB.x0 + vpcB.x1) / 2 + (portrait ? 14 : 20)
  const cache = { x0: cx - 15, y0: top + (portrait ? 28 : 40), x1: cx + 15, y1: bottom - (portrait ? 12 : 22) }
  const keys = Array.from({ length: KEYS }, (_, i) => ({ x: cx, y: cache.y0 + 17 + ((cache.y1 - cache.y0 - 34) * i) / (KEYS - 1) }))
  const chartTop = bottom + (portrait ? 54 : 66)
  return {
    portrait,
    vpcA,
    vpcB,
    clients,
    api: { x: w * (portrait ? 0.36 : 0.32), y: mid - (portrait ? 20 : 30) },
    db: { x: w * (portrait ? 0.47 : 0.48), y: bottom - (portrait ? 42 : 58) },
    cache,
    keys,
    chart: { x0: portrait ? 58 : 62, y0: chartTop, x1: w - (portrait ? 16 : 24), y1: h - (portrait ? 30 : 34) },
  }
}

function gauss(random: () => number) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function percentile(values: Float64Array, n: number) {
  const sorted = values.subarray(0, n).sort()
  return sorted[Math.max(0, Math.ceil(0.95 * n) - 1)]
}

function create(api: SimApi): Sim {
  let L = layout(760, 543)
  let size = { w: 0, h: 0 }
  const reqs: Req[] = []
  const keys: Key[] = Array.from({ length: KEYS }, () => ({
    ttl: 0,
    life: 1,
    holder: null,
    fillMs: 0,
    lockT: 0,
    lockDur: 1,
    waiters: [],
    flash: 0,
  }))
  const trace = {
    time: new Float64Array(CAP),
    ms: new Float64Array(CAP),
    p95: new Float64Array(CAP),
    kind: new Uint8Array(CAP),
    id: new Int32Array(CAP),
    head: 0,
    count: 0,
  }
  const scratch = new Float64Array(WINDOW)
  const reads = new Float64Array(64)
  let readHead = 0
  let cacheOn = true
  let rewritten = true
  let now = 0
  let nextId = 1
  let spawnClock = 0
  let burst = 0
  let total = 0
  let p95 = 0
  let quiet = true
  let dbFlash = 0
  let pending: { label: string; before: number; n: number } | null = null
  const shown = spring(0)
  let hud = ['0 requests', '0% hits']
  let readoutValue = -1
  let readoutText = ''
  const A: Point = { x: 0, y: 0 }
  const B: Point = { x: 0, y: 0 }

  const hitMs = () => 3.5 + 6 * Math.pow(api.random(), 2)
  const ttl = () => 2 + api.random() * 1.5
  const dbMs = () => {
    const load = 1 + 0.06 * readsLastSecond()
    return load * (rewritten ? 30 * Math.exp(0.25 * gauss(api.random)) : 44 * Math.exp(0.3 * gauss(api.random)))
  }
  const dwell = (ms: number) => 0.12 + ms / 400

  for (const k of keys) {
    k.life = ttl()
    k.ttl = k.life * api.random()
  }

  function pickKey() {
    let r = api.random()
    for (let i = 0; i < KEYS; i++) {
      r -= WEIGHTS[i]
      if (r <= 0) return i
    }
    return KEYS - 1
  }

  function leg(r: Req, phase: Phase, from: Node, to: Node, dur: number) {
    r.phase = phase
    r.from = from
    r.to = to
    r.t = 0
    r.dur = dur
  }

  function spawn() {
    const r: Req = {
      id: nextId++,
      client: Math.floor(api.random() * L.clients.length),
      key: pickKey(),
      phase: 'in',
      from: 'client',
      to: 'api',
      t: 0,
      dur: LEG.in,
      ms: 0,
      kind: 'hit',
      slot: 0,
      waitFrac: 0,
    }
    reqs.push(r)
  }

  function noteRead() {
    reads[readHead] = now
    readHead = (readHead + 1) % reads.length
    dbFlash = 1
  }

  function arriveCache(r: Req) {
    const k = keys[r.key]
    if (k.ttl > 0) {
      r.kind = 'hit'
      r.ms = hitMs()
      k.flash = Math.max(k.flash, 0.5)
      leg(r, 'back', 'key', 'api', LEG.back)
    } else if (k.holder) {
      r.kind = 'wait'
      r.slot = k.waiters.length
      r.waitFrac = Math.min(1, k.lockT / k.lockDur)
      k.waiters.push(r)
      leg(r, 'toWait', 'key', 'wait', LEG.toWait)
    } else lock(r, k)
  }

  function lock(r: Req, k: Key) {
    r.kind = 'miss'
    k.holder = r
    k.fillMs = dbMs()
    k.lockT = 0
    k.lockDur = LEG.db * 2 + dwell(k.fillMs)
    r.ms = hitMs() + 6 + k.fillMs + 6
    leg(r, 'toDb', 'key', 'db', LEG.db)
  }

  function fill(r: Req) {
    const k = keys[r.key]
    k.holder = null
    k.life = ttl()
    k.ttl = k.life
    k.flash = 1
    for (const wr of k.waiters) {
      wr.ms = hitMs() + 6 + (1 - wr.waitFrac) * (k.fillMs + 6)
      leg(wr, 'back', 'wait', 'api', LEG.back + wr.slot * 0.05)
    }
    k.waiters.length = 0
    leg(r, 'back', 'key', 'api', LEG.back)
  }

  function advance(r: Req) {
    switch (r.phase) {
      case 'in':
        if (cacheOn) leg(r, 'ask', 'api', 'key', LEG.ask)
        else leg(r, 'direct', 'api', 'db', LEG.direct)
        return
      case 'ask':
        return arriveCache(r)
      case 'toWait':
        return leg(r, 'waiting', 'wait', 'wait', Infinity)
      case 'toDb':
        noteRead()
        return leg(r, 'read', 'db', 'db', dwell(keys[r.key].fillMs))
      case 'read':
        return leg(r, 'fill', 'db', 'key', LEG.db)
      case 'fill':
        return fill(r)
      case 'direct':
        return startDirect(r)
      case 'readDirect':
        return leg(r, 'dbBack', 'db', 'api', LEG.direct)
      case 'out':
        return complete(r)
      default:
        return leg(r, 'out', 'api', 'client', LEG.out)
    }
  }

  function startDirect(r: Req) {
    r.kind = 'db'
    const ms = dbMs()
    r.ms = ms + 2
    noteRead()
    leg(r, 'readDirect', 'db', 'db', dwell(ms))
  }

  function record(r: Req) {
    const i = trace.head
    trace.time[i] = now
    trace.ms[i] = r.ms
    trace.kind[i] = r.kind === 'hit' ? 0 : r.kind === 'wait' ? 1 : r.kind === 'miss' ? 2 : 3
    trace.id[i] = r.id
    trace.head = (i + 1) % CAP
    trace.count = Math.min(CAP, trace.count + 1)
    const n = Math.min(WINDOW, trace.count)
    let hits = 0
    for (let j = 0; j < n; j++) {
      const at = (i - j + CAP) % CAP
      scratch[j] = trace.ms[at]
      if (trace.kind[at] < 2) hits++
    }
    p95 = percentile(scratch, n)
    trace.p95[i] = p95
    return Math.round((100 * hits) / n)
  }

  function complete(r: Req) {
    reqs.splice(reqs.indexOf(r), 1)
    total++
    const rate = record(r)
    hud = [`${fmt(total)} requests`, `${rate}% hits`]
    if (quiet) shown.value = shown.target = p95
    shown.target = p95
    if (!pending) return
    pending.n++
    if (pending.n < WINDOW) return
    const ms = Math.round(p95)
    const verb = ms > pending.before * 1.08 ? 'rose to' : ms < pending.before * 0.92 ? 'fell to' : 'held at'
    api.say(`${pending.label}: P95 ${verb} ${ms} ms over the last ${WINDOW} requests.`)
    pending = null
  }

  function stepKeys(dt: number) {
    for (const k of keys) {
      if (k.ttl > 0) k.ttl = Math.max(0, k.ttl - dt)
      if (k.holder) k.lockT += dt
      k.flash = Math.max(0, k.flash - dt * 2.2)
    }
  }

  function stepSpawn(dt: number) {
    if (!api.ambient && burst <= 0) return
    spawnClock -= dt
    while (spawnClock <= 0) {
      spawn()
      if (!api.ambient) burst--
      spawnClock += (0.4 + 1.2 * api.random()) / RATE
    }
  }

  function step(dt: number) {
    now += dt
    stepSpawn(dt)
    stepKeys(dt)
    for (let i = reqs.length - 1; i >= 0; i--) {
      const r = reqs[i]
      r.t += dt
      if (r.t >= r.dur) advance(r)
    }
    dbFlash = Math.max(0, dbFlash - dt * 3)
    stepSpring(shown, dt, 60, 15)
  }

  for (let t = 0; t < SPAN + 4; t += 1 / 60) step(1 / 60)
  quiet = false

  function at(node: Node, r: Req, out: Point) {
    let p: Point
    if (node === 'client') p = L.clients[r.client % L.clients.length]
    else if (node === 'api') p = L.api
    else if (node === 'db') p = L.db
    else p = L.keys[r.key]
    out.x = p.x
    out.y = p.y
    if (node === 'wait') {
      out.x -= 24 + Math.min(r.slot, 7) * 8
      out.y += r.slot > 7 ? 6 : 0
    } else if (node === 'key') out.x -= 15
  }

  function position(r: Req, out: Point) {
    at(r.from, r, A)
    if (r.from === r.to) {
      out.x = A.x
      out.y = A.y
      return
    }
    at(r.to, r, B)
    const k = ease(Math.min(1, r.t / r.dur))
    const bend = r.from === 'db' || r.to === 'db' ? (r.phase === 'fill' || r.phase === 'dbBack' ? 0.16 : -0.16) : 0.06
    const mx = (A.x + B.x) / 2 - (B.y - A.y) * bend
    const my = (A.y + B.y) / 2 + (B.x - A.x) * bend
    const u = 1 - k
    out.x = u * u * A.x + 2 * u * k * mx + k * k * B.x
    out.y = u * u * A.y + 2 * u * k * my + k * k * B.y
  }

  function readsLastSecond() {
    let n = 0
    for (let i = 0; i < reads.length; i++) if (reads[i] > 0 && now - reads[i] <= 1) n++
    return n
  }

  function hitRate() {
    const n = Math.min(WINDOW, trace.count)
    let hits = 0
    for (let j = 0; j < n; j++) if (trace.kind[(trace.head - 1 - j + CAP) % CAP] < 2) hits++
    return n ? Math.round((100 * hits) / n) : 0
  }

  const KIND_TEXT = ['cache hit', 'waited for the fill, then hit', 'cache miss, read the database', 'read the database, cache off']
  const PHASE_TEXT: Partial<Record<Phase, string>> = {
    in: 'on its way to the API',
    ask: 'asking the cache',
    waiting: 'waiting for the fill',
    toWait: 'waiting for the fill',
    toDb: 'holding the lock, reading the database',
    read: 'holding the lock, reading the database',
    fill: 'filling the cache',
    direct: 'reading the database',
    readDirect: 'reading the database',
  }

  function inspectChart(x: number, y: number) {
    const c = L.chart
    if (x < c.x0 - 6 || x > c.x1 + 6 || y < c.y0 - 6 || y > c.y1 + 6) return null
    let best = -1
    let bestD = Infinity
    for (let j = 0; j < trace.count; j++) {
      const i = (trace.head - 1 - j + CAP) % CAP
      if (now - trace.time[i] > SPAN) break
      const dx = tx(trace.time[i]) - x
      const dy = ty(trace.ms[i]) - y
      const d = dx * dx + dy * dy * 0.2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) return null
    return `Request ${fmt(trace.id[best])}: ${Math.round(trace.ms[best])} ms, ${KIND_TEXT[trace.kind[best]]}`
  }

  function inspectKey(x: number, y: number) {
    for (let i = 0; i < KEYS; i++) {
      const p = L.keys[i]
      if (Math.hypot(p.x - x, p.y - y) > 11) continue
      const k = keys[i]
      if (k.holder) return `Key ${i + 1}: locked while it fills, ${k.waiters.length} waiting`
      if (k.ttl > 0) return `Key ${i + 1}: cached, expires in ${Math.ceil(k.ttl)} s`
      return `Key ${i + 1}: expired, the next request misses`
    }
    return null
  }

  function inspectRequest(x: number, y: number) {
    for (const r of reqs) {
      position(r, A)
      if (Math.hypot(A.x - x, A.y - y) < 7) return `Request ${fmt(r.id)}: ${PHASE_TEXT[r.phase] ?? 'returning to the client'}`
    }
    return null
  }

  function inspectNodes(x: number, y: number) {
    const c = L.cache
    if (x > c.x0 - 30 && x < c.x1 + 8 && y > c.y0 - 8 && y < c.y1 + 8) {
      return cacheOn ? `Cache: ${hitRate()}% hits over the last ${WINDOW} requests` : 'Cache: off, every request reads the database'
    }
    if (Math.hypot(L.db.x - x, L.db.y - y) < 28) return `Database: ${readsLastSecond()} reads in the last second`
    if (Math.hypot(L.api.x - x, L.api.y - y) < 26) return `POS API: ${reqs.length} requests in flight`
    const i = L.clients.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 14)
    return i >= 0 ? `POS client ${i + 1}` : null
  }

  function tx(t: number) {
    const c = L.chart
    return c.x1 - ((now - t) / SPAN) * (c.x1 - c.x0)
  }

  function ty(ms: number) {
    const c = L.chart
    return c.y1 - (c.y1 - c.y0) * Math.sqrt(Math.min(ms, MAX_MS) / MAX_MS)
  }

  function onToggle(cache: boolean, queries: boolean) {
    const changedCache = cache !== cacheOn
    cacheOn = cache
    rewritten = queries
    burst = WINDOW + 20
    const name = changedCache ? (cacheOn ? 'Cache on' : 'Cache off') : rewritten ? 'Rewritten queries' : 'Original queries'
    pending = { label: name, before: Math.round(p95), n: 0 }
    if (changedCache) {
      api.say(
        cacheOn
          ? 'Cache on: requests ask the cache first; a miss takes the lock, reads the database and fills the key.'
          : 'Cache off: every request reads the database.',
      )
    } else {
      api.say(rewritten ? 'Rewritten queries: simulated database reads are faster.' : 'Original queries: simulated database reads are slower.')
    }
  }

  return {
    step,
    draw(g, w, h, p) {
      if (w !== size.w || h !== size.h) {
        size = { w, h }
        L = layout(w, h)
      }
      drawRegions(g, p)
      drawLinks(g, p)
      drawRequests(g, p)
      drawClients(g, p)
      drawApi(g, p)
      drawDb(g, p)
      drawCache(g, p)
      drawChart(g, p)
      drawHud(g, w, p)
    },
    action(name, value) {
      if (name === 'cache') onToggle(value === 1, rewritten)
      else if (name === 'queries') onToggle(cacheOn, value === 1)
    },
    inspect(x, y) {
      return inspectChart(x, y) ?? inspectKey(x, y) ?? inspectRequest(x, y) ?? inspectNodes(x, y)
    },
  }

  function drawRegion(g: CanvasRenderingContext2D, r: Rect, name: string, p: Palette) {
    g.fillStyle = alpha(p.dot, p.dark ? 0.07 : 0.09)
    g.strokeStyle = alpha(p.dot, p.dark ? 0.22 : 0.28)
    g.lineWidth = 1
    pill(g, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 16)
    g.fill()
    g.stroke()
    label(g, name, r.x0 + 4, r.y0 - 12, p.muted, 11.5, 540)
  }

  function drawRegions(g: CanvasRenderingContext2D, p: Palette) {
    drawRegion(g, L.vpcA, 'VPC A', p)
    drawRegion(g, L.vpcB, 'VPC B', p)
  }

  function drawLinks(g: CanvasRenderingContext2D, p: Palette) {
    g.strokeStyle = alpha(p.dot, p.dark ? 0.35 : 0.45)
    g.lineWidth = 1
    g.setLineDash([2, 4])
    g.beginPath()
    for (const c of L.clients) {
      g.moveTo(c.x + 10, c.y)
      g.lineTo(L.api.x - 20, L.api.y)
    }
    g.moveTo(L.api.x, L.api.y)
    g.lineTo(L.db.x, L.db.y)
    g.stroke()
    g.globalAlpha = cacheOn ? 1 : 0.35
    g.beginPath()
    g.moveTo(L.api.x + 20, L.api.y)
    g.lineTo(L.cache.x0 - 2, (L.cache.y0 + L.cache.y1) / 2)
    g.moveTo(L.db.x + 22, L.db.y)
    g.lineTo(L.cache.x0 - 2, L.keys[KEYS - 1].y)
    g.stroke()
    g.globalAlpha = 1
    g.setLineDash([])
  }

  function drawRequests(g: CanvasRenderingContext2D, p: Palette) {
    g.fillStyle = p.blue
    g.beginPath()
    for (const r of reqs) {
      position(r, A)
      g.moveTo(A.x + 3.2, A.y)
      g.arc(A.x, A.y, 3.2, 0, Math.PI * 2)
    }
    g.fill()
  }

  function drawClients(g: CanvasRenderingContext2D, p: Palette) {
    for (const c of L.clients) {
      g.fillStyle = p.blue
      pill(g, c.x - 9, c.y - 7, 18, 13, 3.5)
      g.fill()
      g.fillStyle = alpha(p.bg, p.dark ? 0.55 : 0.7)
      pill(g, c.x - 6, c.y - 4.5, 12, 7, 1.5)
      g.fill()
      g.fillStyle = alpha(p.blue, 0.8)
      g.fillRect(c.x - 4, c.y + 7, 8, 2)
    }
    const c0 = L.clients[0]
    label(g, 'POS clients', c0.x - 10, c0.y - 22, p.muted, 11.5, 520)
  }

  function drawApi(g: CanvasRenderingContext2D, p: Palette) {
    const { x, y } = L.api
    ball(g, x, y, L.portrait ? 16 : 19, p.green, p.dark)
    label(g, 'POS API', x, y + (L.portrait ? 29 : 33), p.green, 12, 560, 'center')
  }

  function drawDb(g: CanvasRenderingContext2D, p: Palette) {
    const { x, y } = L.db
    const rw = L.portrait ? 17 : 20
    const rh = L.portrait ? 22 : 26
    if (dbFlash > 0) glow(g, x, y, 46, p.slate, dbFlash * 0.7)
    const side = g.createLinearGradient(x - rw, 0, x + rw, 0)
    side.addColorStop(0, mix(p.slate, '#ffffff', p.dark ? 0.25 : 0.2))
    side.addColorStop(0.6, p.slate)
    side.addColorStop(1, mix(p.slate, '#000000', 0.3))
    g.fillStyle = side
    g.beginPath()
    g.ellipse(x, y + rh / 2, rw, 6, 0, 0, Math.PI)
    g.lineTo(x - rw, y - rh / 2)
    g.ellipse(x, y - rh / 2, rw, 6, 0, Math.PI, 0, true)
    g.closePath()
    g.fill()
    g.fillStyle = mix(p.slate, '#ffffff', p.dark ? 0.4 : 0.35)
    g.beginPath()
    g.ellipse(x, y - rh / 2, rw, 6, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = alpha(mix(p.slate, '#000000', 0.35), 0.5)
    g.lineWidth = 1
    g.beginPath()
    g.ellipse(x, y + 1, rw, 6, 0, 0.15, Math.PI - 0.15)
    g.stroke()
    label(g, 'Database', x, y + rh / 2 + 20, p.slate, 12, 560, 'center')
  }

  function drawCache(g: CanvasRenderingContext2D, p: Palette) {
    const c = L.cache
    g.save()
    g.globalAlpha = cacheOn ? 1 : 0.4
    g.fillStyle = alpha(p.teal, p.dark ? 0.12 : 0.1)
    g.strokeStyle = alpha(p.teal, 0.75)
    g.lineWidth = 1.5
    pill(g, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 15)
    g.fill()
    g.stroke()
    label(g, cacheOn ? 'Redis cache' : 'Cache off', (c.x0 + c.x1) / 2, c.y0 - 14, p.teal, 12, 560, 'center')
    for (let i = 0; i < KEYS; i++) drawKey(g, keys[i], L.keys[i], p)
    g.restore()
  }

  function drawKey(g: CanvasRenderingContext2D, k: Key, at: Point, p: Palette) {
    const s = L.portrait ? 0.82 : 1
    if (k.flash > 0) glow(g, at.x, at.y, 26, p.teal, k.flash)
    if (k.ttl > 0) {
      g.fillStyle = p.teal
      g.beginPath()
      g.arc(at.x, at.y, 5.5 * s, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = alpha(p.teal, 0.55)
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(at.x, at.y, 9 * s, -Math.PI / 2, -Math.PI / 2 + (k.ttl / k.life) * Math.PI * 2)
      g.stroke()
    } else {
      g.strokeStyle = alpha(p.teal, 0.6)
      g.lineWidth = 1.25
      g.beginPath()
      g.arc(at.x, at.y, 5 * s, 0, Math.PI * 2)
      g.stroke()
    }
    if (k.holder) drawLock(g, k, at, s, p)
  }

  function drawLock(g: CanvasRenderingContext2D, k: Key, at: Point, s: number, p: Palette) {
    glow(g, at.x, at.y, 24, p.amber, 0.6)
    g.strokeStyle = p.amber
    g.lineWidth = 2
    g.beginPath()
    g.arc(at.x, at.y, 9.5 * s, 0, Math.PI * 2)
    g.stroke()
    g.lineWidth = 2.5
    g.lineCap = 'round'
    const a = -Math.PI / 2 + Math.min(1, k.lockT / k.lockDur) * Math.PI * 2
    g.beginPath()
    g.arc(at.x, at.y, 13 * s, -Math.PI / 2, a)
    g.stroke()
    g.lineCap = 'butt'
  }

  function drawGrid(g: CanvasRenderingContext2D, p: Palette) {
    const c = L.chart
    g.strokeStyle = alpha(p.dot, p.dark ? 0.22 : 0.3)
    g.lineWidth = 1
    g.beginPath()
    for (const ms of GRID) {
      const y = Math.round(ty(ms)) + 0.5
      g.moveTo(c.x0, y)
      g.lineTo(c.x1, y)
    }
    g.stroke()
    g.strokeStyle = alpha(p.dot, p.dark ? 0.45 : 0.55)
    g.beginPath()
    g.moveTo(c.x0, Math.round(c.y1) + 0.5)
    g.lineTo(c.x1, Math.round(c.y1) + 0.5)
    g.stroke()
    for (const ms of GRID) tabular(g, `${ms} ms`, c.x0 - 8, ty(ms), p.muted, 11, 500, 'right')
    label(g, `${SPAN} s ago`, c.x0, c.y1 + 15, p.muted, 11, 500)
    label(g, 'now', c.x1, c.y1 + 15, p.muted, 11, 500, 'right')
  }

  function drawDots(g: CanvasRenderingContext2D, p: Palette) {
    const fromCache = p.teal
    const fromDb = p.dark ? mix(p.slate, '#ffffff', 0.25) : p.slate
    for (let pass = 0; pass < 2; pass++) {
      g.fillStyle = pass ? fromDb : fromCache
      g.beginPath()
      for (let j = 0; j < trace.count; j++) {
        const i = (trace.head - 1 - j + CAP) % CAP
        if (now - trace.time[i] > SPAN) break
        if ((trace.kind[i] >= 2 ? 1 : 0) !== pass) continue
        const x = tx(trace.time[i])
        const y = ty(trace.ms[i])
        g.moveTo(x + 2.4, y)
        g.arc(x, y, 2.4, 0, Math.PI * 2)
      }
      g.fill()
    }
  }

  function drawP95Line(g: CanvasRenderingContext2D, p: Palette) {
    const c = L.chart
    g.strokeStyle = p.strong
    g.lineWidth = 1.75
    g.lineJoin = 'round'
    g.beginPath()
    let first = true
    let lastY = c.y1
    for (let j = 0; j < trace.count; j++) {
      const i = (trace.head - 1 - j + CAP) % CAP
      const x = Math.max(c.x0, tx(trace.time[i]))
      const y = ty(trace.p95[i])
      if (first) {
        g.moveTo(c.x1, ty(shown.value))
        lastY = y
        first = false
      }
      g.lineTo(x, y)
      lastY = y
      if (x <= c.x0) break
    }
    g.stroke()
    g.fillStyle = p.strong
    g.beginPath()
    g.arc(c.x1, ty(shown.value), 3, 0, Math.PI * 2)
    g.fill()
    return lastY
  }

  function drawReadout(g: CanvasRenderingContext2D, p: Palette) {
    const c = L.chart
    const v = Math.max(0, Math.round(shown.value))
    if (v !== readoutValue) {
      readoutValue = v
      readoutText = `${v} ms`
    }
    const y = c.y0 - (L.portrait ? 20 : 24)
    const size = L.portrait ? 20 : 24
    tabular(g, readoutText, c.x1, y, p.strong, size, 620, 'right')
    g.font = `620 ${size}px ${FONT}`
    const tw = g.measureText('0').width * (readoutText.length - 3) + g.measureText(' ms').width
    label(g, 'P95', c.x1 - tw - 8, y + 1, p.muted, 12, 560, 'right')
    label(g, 'Latency per request', c.x0, y, p.muted, 12, 540)
    const lx = L.portrait ? (c.x0 + c.x1) / 2 - 58 : c.x0 + 142
    const ly = L.portrait ? c.y1 + 15 : y
    legendDot(g, lx, ly, p.teal, 'cache', p)
    legendDot(g, lx + 58, ly, p.dark ? mix(p.slate, '#ffffff', 0.25) : p.slate, 'database', p)
  }

  function legendDot(g: CanvasRenderingContext2D, x: number, y: number, color: string, text: string, p: Palette) {
    g.fillStyle = color
    g.beginPath()
    g.arc(x + 3, y, 3, 0, Math.PI * 2)
    g.fill()
    label(g, text, x + 11, y, p.muted, 11, 500)
  }

  function drawChart(g: CanvasRenderingContext2D, p: Palette) {
    drawGrid(g, p)
    g.save()
    g.beginPath()
    g.rect(L.chart.x0, L.chart.y0 - 8, L.chart.x1 - L.chart.x0 + 4, L.chart.y1 - L.chart.y0 + 12)
    g.clip()
    drawDots(g, p)
    drawP95Line(g, p)
    g.restore()
    drawReadout(g, p)
  }

  function drawHud(g: CanvasRenderingContext2D, w: number, p: Palette) {
    const y = 22
    const x = 20
    label(g, 'Simulated', x, y, p.muted, 11.5, 520)
    let cx = x + 74
    for (const part of hud) {
      tabular(g, part, cx, y, p.strong, 12, 560)
      g.font = `560 12px ${FONT}`
      cx += g.measureText(part).width + 22
      if (cx > w - 40) break
    }
  }
}

export function mount(figure: HTMLElement) {
  mountSim(figure, create)
}
