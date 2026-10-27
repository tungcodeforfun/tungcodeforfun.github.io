import { alpha, ball, glow, label, mix, pill, tabular, type Palette } from './draw'
import { mountSim, setControl, type Sim, type SimApi } from './stage'

type Item = {
  id: number
  e: number
  k: number
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  a: number
  has: boolean
  want: boolean
  pending: boolean
  fall: number
  gone: boolean
  flash: number
}
type Packet = { items: Item[]; t: number; dur: number }
type Spark = { item: Item; t: number; dur: number }
type Flag = { up: boolean; rise: number; flash: number; ping: number }
type Rect = { x: number; y: number; w: number; h: number }
type Pack = { c: number; cols: number; x: number; y: number; rows: number }
type Layout = {
  portrait: boolean
  r: number
  source: [number, number]
  pill: { x0: number; x1: number; y: number; h: number }
  api: [number, number]
  field: { x0: number; y0: number; x1: number; y1: number }
  cap: number
  flags: { x0: number; x1: number; y: number; pole: number }
}

const TOTAL = 1300
const STORES = 40
const VENUES = ['Venue A', 'Venue B', 'Venue C']
const FALL = 0.55
const PLAY_TIME = 3
const SETTLE = 0.4
const VISIT = 0.045
const fmt = (n: number) => n.toLocaleString('en-US')

function layout(w: number, h: number): Layout {
  if (h > w * 0.95) {
    return {
      portrait: true,
      r: 13,
      source: [w * 0.09, h * 0.17],
      pill: { x0: w * 0.36, x1: w * 0.63, y: h * 0.17, h: 26 },
      api: [w * 0.82, h * 0.17],
      field: { x0: w * 0.07, y0: h * 0.33, x1: w * 0.93, y1: h * 0.8 },
      cap: 20,
      flags: { x0: w * 0.06, x1: w * 0.92, y: h * 0.955, pole: 16 },
    }
  }
  return {
    portrait: false,
    r: 15,
    source: [w * 0.075, h * 0.16],
    pill: { x0: w * 0.24, x1: w * 0.58, y: h * 0.16, h: 30 },
    api: [w * 0.69, h * 0.16],
    field: { x0: w * 0.05, y0: h * 0.29, x1: w * 0.95, y1: h * 0.8 },
    cap: 26,
    flags: { x0: w * 0.06, x1: w * 0.93, y: h * 0.95, pole: 22 },
  }
}

function pack(n: number, L: Layout): Pack {
  const { x0, y0, x1, y1 } = L.field
  const W = x1 - x0
  const H = y1 - y0
  const count = Math.max(1, n)
  let c = Math.min(L.cap, Math.sqrt((W * H) / count))
  for (;;) {
    const most = Math.max(1, Math.min(Math.floor(W / c), Math.ceil(Math.sqrt((count * W) / H))))
    const cols = balance(count, most, Math.floor(H / c + 0.001))
    const rows = Math.ceil(count / cols)
    if (rows * c <= H + 0.01) return { c, cols, rows, x: x0 + (W - cols * c) / 2, y: y0 + (H - rows * c) / 2 }
    c *= 0.98
  }
}

function balance(count: number, most: number, maxRows: number) {
  let best = most
  let fill = 0
  for (let cols = most; cols >= Math.max(1, most - 3); cols--) {
    const rows = Math.ceil(count / cols)
    const f = count / (rows * cols)
    if (rows <= maxRows && f > fill + 0.02) {
      best = cols
      fill = f
    }
  }
  return best
}

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function approach(from: number, to: number, rate: number, dt: number) {
  return from + (to - from) * (1 - Math.exp(-rate * dt))
}

function create(api: SimApi, figure: HTMLElement): Sim {
  let L = layout(700, 500)
  let size = { w: 0, h: 0 }
  let grid: Pack = pack(TOTAL, L)
  const panel: Rect = { x: 0, y: 0, w: 0, h: 0 }
  let cell = grid.c
  const items: Item[] = []
  const eligible: Uint8Array[] = VENUES.map(() => new Uint8Array(TOTAL))
  const eligibleCount: number[] = []
  const flags: Flag[] = Array.from({ length: STORES }, () => ({ up: false, rise: 0, flash: 0, ping: 0 }))
  let packets: Packet[] = []
  const sparks: Spark[] = []
  let outbox: Item[] = []
  let venue = 0
  let feed = 0
  let emitClock = 0
  let ambientClock = 0.3
  let apiFlash = 0
  let dirty = true
  let sinceChange = 0
  let sinceReflow = 0
  let settle = -1
  let play: { from: number; t: number } | null = null
  let driving = false
  let lastSync = 0
  let backfill: { t: number; next: number; changed: number } | null = null
  let alive = TOTAL
  let hud = ''
  let hudKey = ''

  for (let i = 0; i < TOTAL; i++) {
    items.push({
      id: i + 1,
      e: 0.01 + api.random() * 0.98,
      k: 55 + api.random() * 35,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      tx: 0,
      ty: 0,
      a: 1,
      has: false,
      want: false,
      pending: false,
      fall: 0,
      gone: false,
      flash: 0,
    })
  }
  eligible.forEach((set, v) => {
    const order = items.map((it) => it.id - 1)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(api.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const n = 128 + Math.floor(api.random() * 7)
    for (let i = 0; i < n; i++) set[order[i]] = 1
    eligibleCount[v] = n
  })

  const isEligible = (it: Item) => eligible[venue][it.id - 1] === 1
  const listedTarget = () => items.reduce((n, it) => n + (it.want && !isEligible(it) ? 0 : 1), 0)
  const listed = (it: Item) => !it.gone && it.fall === 0

  function reflow(snap: boolean) {
    alive = items.reduce((n, it) => n + (listed(it) ? 1 : 0), 0)
    grid = pack(alive, L)
    const lastRow = Math.floor((alive - 1) / grid.cols)
    const shift = ((grid.cols - (alive - lastRow * grid.cols)) * grid.c) / 2
    let slot = 0
    for (const it of items) {
      if (!listed(it)) continue
      const row = Math.floor(slot / grid.cols)
      it.tx = grid.x + ((slot % grid.cols) + 0.5) * grid.c + (row === lastRow ? shift : 0)
      it.ty = grid.y + (row + 0.5) * grid.c
      slot++
      if (snap) {
        it.x = it.tx
        it.y = it.ty
      }
    }
    if (snap) {
      cell = grid.c
      Object.assign(panel, blockRect())
    }
    dirty = false
    sinceReflow = 0
  }

  function blockRect(): Rect {
    const rows = Math.ceil(Math.max(1, alive) / grid.cols)
    const pad = Math.max(6, grid.c * 0.35)
    return { x: grid.x - pad, y: grid.y - pad, w: grid.cols * grid.c + pad * 2, h: rows * grid.c + pad * 2 }
  }

  function rebuild(w: number, h: number) {
    const first = size.w === 0
    size = { w, h }
    L = layout(w, h)
    reflow(true)
    if (first) packets = []
  }

  function drop(it: Item) {
    it.fall = 0.0001
    it.vx = (api.random() - 0.5) * 60
    it.vy = -30 - api.random() * 40
    dirty = true
    sinceChange = 0
  }

  function restore(it: Item) {
    if (it.fall === 0 && !it.gone) return
    it.fall = 0
    it.gone = false
    it.a = 0
    it.vx = 0
    it.vy = 0
    dirty = true
    sinceChange = 0
  }

  function sync(it: Item) {
    if (!it.has || isEligible(it)) restore(it)
    else if (listed(it)) drop(it)
  }

  function applyFeed(value: number) {
    const next = value / 100
    const added: Item[] = []
    for (const it of items) {
      const want = it.e < next
      if (want === it.want) continue
      it.want = want
      if (want && !it.has && !it.pending) {
        it.pending = true
        added.push(it)
      } else if (!want && it.has) {
        it.has = false
        sync(it)
      }
    }
    added.sort((a, b) => (next >= feed ? a.e - b.e : b.e - a.e))
    outbox = outbox.filter((it) => it.want).concat(added)
    feed = next
    settle = SETTLE
  }

  function emit(dt: number) {
    emitClock -= dt
    if (emitClock > 0) return
    outbox = outbox.filter((it) => it.want || ((it.pending = false), false))
    if (outbox.length) {
      const n = Math.min(60, Math.max(14, Math.ceil(outbox.length / 5)))
      packets.push({ items: outbox.splice(0, n), t: 0, dur: 0.8 })
      emitClock = 0.07
      return
    }
    ambientClock -= Math.max(dt, 0.07)
    emitClock = 0.07
    if (api.ambient && ambientClock <= 0) {
      packets.push({ items: [], t: 0, dur: 1.1 + api.random() * 0.5 })
      ambientClock = 0.45 + api.random() * 0.5
    }
  }

  function arrive(p: Packet) {
    if (p.items.length) apiFlash = 1
    else apiFlash = Math.max(apiFlash, 0.45)
    p.items.forEach((it, i) => {
      if (it.want && !it.has) sparks.push({ item: it, t: -i * 0.012, dur: 0.35 + api.random() * 0.25 })
      else it.pending = false
    })
  }

  function land(it: Item) {
    it.pending = false
    if (!it.want || it.has) return
    it.has = true
    if (isEligible(it)) it.flash = 1
    else drop(it)
  }

  function stepPipeline(dt: number) {
    emit(dt)
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]
      p.t += dt
      if (p.t < p.dur) continue
      arrive(p)
      packets.splice(i, 1)
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]
      s.t += dt
      if (s.t < s.dur) continue
      land(s.item)
      sparks[i] = sparks[sparks.length - 1]
      sparks.pop()
    }
    apiFlash = Math.max(0, apiFlash - dt * 2.2)
  }

  function stepItem(it: Item, dt: number) {
    it.flash = Math.max(0, it.flash - dt * 1.5)
    if (it.gone) return
    if (it.fall > 0) {
      it.fall += dt
      it.vy += 700 * dt
      it.x += it.vx * dt
      it.y += it.vy * dt
      it.a = Math.max(0, 1 - it.fall / FALL)
      if (it.fall >= FALL) {
        it.gone = true
        it.fall = 0
      }
      return
    }
    it.a = Math.min(1, it.a + dt * 2.5)
    const damp = 9
    it.vx += ((it.tx - it.x) * it.k - it.vx * damp) * dt
    it.vy += ((it.ty - it.y) * it.k - it.vy * damp) * dt
    it.x += it.vx * dt
    it.y += it.vy * dt
  }

  function stepPlay(dt: number) {
    if (!play) return
    play.t += dt
    const k = Math.min(1, play.t / PLAY_TIME)
    const value = play.from + (100 - play.from) * ease(k)
    applyFeed(value)
    const rounded = Math.round(value)
    if (rounded !== lastSync) {
      lastSync = rounded
      driving = true
      setControl(figure, 'feed', rounded)
      driving = false
    }
    if (k >= 1) play = null
  }

  function stepBackfill(dt: number) {
    if (!backfill) return
    backfill.t += dt
    while (backfill.next < STORES && backfill.t >= backfill.next * VISIT) {
      const f = flags[backfill.next++]
      f.ping = 1
      if (f.up) continue
      f.up = true
      f.flash = 1
      backfill.changed++
    }
    if (backfill.t < STORES * VISIT + 0.35) return
    api.say(
      backfill.changed
        ? `Backfill raised flags on ${backfill.changed} stores.`
        : 'Backfill ran again and changed nothing: every flag was already set.',
    )
    backfill = null
  }

  function stepFlags(dt: number) {
    for (const f of flags) {
      f.rise = approach(f.rise, f.up ? 1 : 0, 9, dt)
      f.flash = Math.max(0, f.flash - dt * 1.4)
      f.ping = Math.max(0, f.ping - dt * 2)
    }
  }

  function stepSettle(dt: number) {
    if (settle < 0) return
    settle -= dt
    if (settle > 0 || play) return
    settle = -1
    api.say(
      `${VENUES[venue]}: ${fmt(listedTarget())} of ${fmt(TOTAL)} items listed after ${Math.round(feed * 100)}% of eligibility events.`,
    )
  }

  function stepLayout(dt: number) {
    sinceChange += dt
    sinceReflow += dt
    if (dirty && (sinceChange > 0.25 || sinceReflow > 0.9)) reflow(false)
    cell = approach(cell, grid.c, 5, dt)
    const r = blockRect()
    panel.x = approach(panel.x, r.x, 6, dt)
    panel.y = approach(panel.y, r.y, 6, dt)
    panel.w = approach(panel.w, r.w, 6, dt)
    panel.h = approach(panel.h, r.h, 6, dt)
  }

  function chooseVenue(v: number) {
    venue = Math.max(0, Math.min(VENUES.length - 1, v))
    for (const it of items) sync(it)
    api.say(
      `${VENUES[venue]}: ${fmt(listedTarget())} of ${fmt(TOTAL)} items listed; ${eligibleCount[venue]} are eligible here.`,
    )
  }

  function runBackfill() {
    if (backfill) {
      api.say('The backfill is already running.')
      return
    }
    backfill = { t: 0, next: 0, changed: 0 }
    api.say(`Backfill running across ${STORES} stores.`)
  }

  function startPlay() {
    if (feed >= 1) return
    play = { from: feed * 100, t: 0 }
    lastSync = Math.round(feed * 100)
    api.say('Eligibility events are arriving from the upstream platform.')
  }

  return {
    step(dt) {
      if (!size.w) return
      stepPlay(dt)
      stepPipeline(dt)
      for (const it of items) stepItem(it, dt)
      stepLayout(dt)
      stepBackfill(dt)
      stepFlags(dt)
      stepSettle(dt)
    },

    draw(g, w, h, p) {
      if (w !== size.w || h !== size.h) rebuild(w, h)
      drawPanel(g, p)
      drawItems(g, p)
      drawSparks(g, p)
      drawPipeline(g, p)
      drawFlags(g, p)
      drawHud(g, w, p)
    },

    action(name, value) {
      if (name === 'feed') {
        if (driving) return
        play = null
        applyFeed(value)
      } else if (name === 'venue') chooseVenue(value)
      else if (name === 'backfill') runBackfill()
      else if (name === 'play') startPlay()
    },

    inspect(x, y) {
      return inspectPipeline(x, y) ?? inspectFlag(x, y) ?? inspectItem(x, y)
    },
  }

  function inspectPipeline(x: number, y: number) {
    const [sx, sy] = L.source
    const [ax, ay] = L.api
    if (Math.hypot(sx - x, sy - y) < L.r + 8) return 'Eligibility platform: publishes item events'
    if (Math.hypot(ax - x, ay - y) < L.r + 8) return `Venue-aware API: serving ${VENUES[venue]}`
    const { x0, x1, y: py, h } = L.pill
    if (x > x0 && x < x1 && Math.abs(y - py) < h / 2 + 4) {
      const n = packets.reduce((s, pk) => s + pk.items.length, 0) + outbox.length
      return `SNS and SQS: ${fmt(n)} event${n === 1 ? '' : 's'} in flight`
    }
    return null
  }

  function flagX(i: number) {
    return L.flags.x0 + ((L.flags.x1 - L.flags.x0) * i) / (STORES - 1)
  }

  function inspectFlag(x: number, y: number) {
    const { y: fy, pole } = L.flags
    if (y < fy - pole - 8 || y > fy + 8) return null
    const gap = (L.flags.x1 - L.flags.x0) / (STORES - 1)
    const i = Math.round((x - L.flags.x0) / gap)
    if (i < 0 || i >= STORES) return null
    return `Store ${i + 1}: flag ${flags[i].up ? 'on' : 'off'}`
  }

  function inspectItem(x: number, y: number) {
    let best: Item | null = null
    let bestD = Math.max(8, cell * 0.75)
    for (const it of items) {
      if (it.gone || it.fall > 0) continue
      const d = Math.hypot(it.x - x, it.y - y)
      if (d < bestD) {
        bestD = d
        best = it
      }
    }
    if (!best) return null
    return `Item ${best.id}: ${isEligible(best) ? 'eligible' : 'not eligible'} at ${VENUES[venue]}`
  }

  function drawPanel(g: CanvasRenderingContext2D, p: Palette) {
    g.fillStyle = alpha(p.ink, p.dark ? 0.04 : 0.03)
    g.strokeStyle = alpha(p.ink, p.dark ? 0.16 : 0.13)
    g.lineWidth = 1
    pill(g, panel.x, panel.y, panel.w, panel.h, Math.min(14, 4 + cell * 0.4))
    g.fill()
    g.stroke()
    label(g, `${VENUES[venue]} menu`, panel.x + 2, panel.y - 13, p.muted, L.portrait ? 11.5 : 12, 540)
  }

  function tilePath(g: CanvasRenderingContext2D, it: Item, s: number) {
    const half = s / 2
    if (s < 5) g.rect(it.x - half, it.y - half, s, s)
    else g.roundRect(it.x - half, it.y - half, s, s, s * 0.24)
  }

  function drawItems(g: CanvasRenderingContext2D, p: Palette) {
    const s = cell * (cell > 14 ? 0.68 : 0.7)
    const confirmed = p.dark ? mix(p.ink, p.stage, 0.12) : p.ink
    const waiting = mix(p.dot, p.ink, p.dark ? 0.22 : 0.18)
    for (const pass of [0, 1]) {
      g.fillStyle = pass ? confirmed : waiting
      g.beginPath()
      for (const it of items) {
        if (it.gone || it.a < 0.99 || it.has !== (pass === 1)) continue
        tilePath(g, it, s)
      }
      g.fill()
    }
    drawTransitions(g, p, s, waiting)
  }

  function drawTransitions(g: CanvasRenderingContext2D, p: Palette, s: number, waiting: string) {
    const falling = mix(waiting, p.muted, 0.45)
    g.save()
    for (const it of items) {
      if (it.gone) continue
      if (it.flash > 0.02) glow(g, it.x, it.y, s * 2.2, p.ink, it.flash * (p.dark ? 0.5 : 0.25))
      if (it.a >= 0.99) continue
      g.globalAlpha = it.a
      g.fillStyle = it.fall > 0 ? falling : it.has ? p.ink : waiting
      g.beginPath()
      tilePath(g, it, it.fall > 0 ? s * (1 - it.fall / FALL * 0.4) : s)
      g.fill()
    }
    g.restore()
  }

  function drawSparks(g: CanvasRenderingContext2D, p: Palette) {
    const [ax, ay] = L.api
    g.fillStyle = p.blue
    g.beginPath()
    for (const sp of sparks) {
      if (sp.t < 0) continue
      const k = sp.t / sp.dur
      const e = 1 - Math.pow(1 - k, 3)
      const x = ax + (sp.item.x - ax) * e
      const y = ay + (sp.item.y - ay) * e - Math.sin(k * Math.PI) * 22
      g.moveTo(x + 1.8, y)
      g.arc(x, y, 1.8, 0, Math.PI * 2)
    }
    g.fill()
  }

  function drawPipeline(g: CanvasRenderingContext2D, p: Palette) {
    const [sx, sy] = L.source
    const [ax, ay] = L.api
    const { x0, x1, y, h } = L.pill
    g.strokeStyle = alpha(p.muted, 0.35)
    g.lineWidth = 1.25
    g.beginPath()
    g.moveTo(sx + L.r + 4, sy)
    g.lineTo(x0, y)
    g.moveTo(x1, y)
    g.lineTo(ax - L.r - 4, ay)
    g.stroke()
    g.fillStyle = alpha(p.orange, p.dark ? 0.1 : 0.08)
    g.strokeStyle = alpha(p.orange, 0.75)
    g.lineWidth = 1.5
    pill(g, x0, y - h / 2, x1 - x0, h)
    g.fill()
    g.stroke()
    const size = L.portrait ? 11.5 : 12
    label(g, 'SNS and SQS', x0 + 4, y - h / 2 - 13, p.orange, size, 560)
    ball(g, sx, sy, L.r, p.purple, p.dark)
    label(g, 'Eligibility platform', Math.max(12, sx - L.r), sy - L.r - 13, p.purple, size, 560)
    if (apiFlash > 0) glow(g, ax, ay, L.r * 3, p.green, apiFlash * (p.dark ? 1 : 0.3))
    ball(g, ax, ay, L.r, p.green, p.dark)
    label(g, 'Venue-aware API', ax, ay - L.r - 13, p.green, size, 560, 'center')
    drawPackets(g, p)
  }

  function drawPackets(g: CanvasRenderingContext2D, p: Palette) {
    const [sx, sy] = L.source
    const ax = L.api[0]
    for (const pk of packets) {
      const k = pk.t / pk.dur
      const from = sx + L.r + 7
      const x = from + (ax - L.r - 7 - from) * ease(k)
      const s = pk.items.length ? 7 + Math.min(4, pk.items.length / 8) : 6
      const fade = Math.min(1, k * 8, (1 - k) * 8)
      g.globalAlpha = fade * (pk.items.length ? 1 : 0.7)
      g.fillStyle = p.blue
      pill(g, x - s / 2, sy - s / 2, s, s, 2.5)
      g.fill()
    }
    g.globalAlpha = 1
  }

  function drawFlags(g: CanvasRenderingContext2D, p: Palette) {
    const { y, pole } = L.flags
    const gap = (L.flags.x1 - L.flags.x0) / (STORES - 1)
    const fw = Math.min(11, gap * 0.66)
    const fh = L.portrait ? 6 : 8
    const on = flags.reduce((n, f) => n + (f.up ? 1 : 0), 0)
    label(g, `Per-store flags, ${on} of ${STORES} set`, L.flags.x0 - 2, y - pole - 16, p.muted, L.portrait ? 11.5 : 12, 540)
    g.strokeStyle = alpha(p.muted, 0.45)
    g.lineWidth = 1
    g.beginPath()
    for (let i = 0; i < STORES; i++) {
      g.moveTo(flagX(i), y)
      g.lineTo(flagX(i), y - pole)
    }
    g.stroke()
    flags.forEach((f, i) => drawFlag(g, p, f, flagX(i), fw, fh))
  }

  function drawFlag(g: CanvasRenderingContext2D, p: Palette, f: Flag, x: number, fw: number, fh: number) {
    const { y, pole } = L.flags
    const top = y - pole + (1 - f.rise) * (pole - fh)
    if (f.flash > 0) glow(g, x + fw / 2, top + fh / 2, 14, p.amber, f.flash * (p.dark ? 1 : 0.4))
    if (f.ping > 0) {
      g.fillStyle = alpha(f.up && f.flash < 0.5 ? p.muted : p.amber, f.ping)
      pill(g, x - 3, y + 4, fw + 6, 2.5, 1.25)
      g.fill()
    }
    g.fillStyle = f.rise > 0.02 ? mix(p.dot, p.amber, Math.min(1, f.rise)) : p.dot
    pill(g, x, top, fw, fh, 1.5)
    g.fill()
  }

  function drawHud(g: CanvasRenderingContext2D, w: number, p: Palette) {
    const shown = items.reduce((n, it) => n + (it.gone || it.fall > 0 ? 0 : 1), 0)
    const key = `${shown}|${venue}`
    if (key !== hudKey) {
      hudKey = key
      hud = `${fmt(shown)} items listed`
    }
    const y = 22
    const x = 20
    label(g, 'Simulated', x, y, p.muted, 11.5, 520)
    tabular(g, hud, x + 74, y, p.strong, 12, 560)
    g.font = '560 12px "Mona Sans"'
    const cx = x + 74 + g.measureText(hud).width + 22
    if (cx < w - 60) label(g, VENUES[venue], cx, y, p.strong, 12, 560)
  }
}

export function mount(figure: HTMLElement) {
  mountSim(figure, (api) => create(api, figure))
}
