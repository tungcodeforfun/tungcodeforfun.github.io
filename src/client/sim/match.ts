import type { Palette } from '../palette'
import { alpha, ball, glow, label, mix, pill, tabular } from './draw'
import { mountSim, type Sim, type SimApi } from './stage'

type Kind = 'id' | 'set' | 'name' | 'review'
type SetState = 'ok' | 'missing' | 'conflict'
type State = 'lane' | 'check' | 'fly' | 'drop' | 'review'
type Batch = { total: number; done: number; by: number[]; review: Rec | null }
type Rec = {
  id: number
  name: string
  code: string
  mid: string | null
  set: SetState
  score: number
  source: number
  batch: Batch | null
  notable: boolean
  x: number
  y: number
  state: State
  next: number
  t: number
  fx: number
  fy: number
  slot: number
}
type Gate = { busy: Rec | null; flash: number; fail: number; count: number }
type Slot = { x: number; y: number; on: boolean; flash: number }
type Pending = { kind: Kind; source: number; batch: Batch | null; notable: boolean }
type Meter = { score: number; t: number; hold: number; done: boolean }
type Layout = {
  portrait: boolean
  sources: [number, number][]
  entry: [number, number]
  dir: [number, number]
  gates: number[]
  end: number
  hold: number
  catalog: { x0: number; y0: number; x1: number; y1: number; cols: number; rows: number }
  tray: { x: number; y: number; w: number }
  card: { w: number; h: number }
}

const STAGES = ['Marketplace ID', 'Set and number', 'Name score']
const BY = ['by marketplace ID', 'by set and number', 'by name']
const CHECK = [0.22, 0.34, 1.05]
const ACCEPT = 0.9
const FLY = 0.85
const ADJ = ['Ember', 'Glass', 'Tidal', 'Moss', 'Ashen', 'Static', 'Copper', 'Frost', 'Hollow', 'Lumen', 'Brine', 'Cinder', 'Quartz', 'Velvet', 'Thorn']
const NOUN = ['Drake', 'Wyrm', 'Sprite', 'Golem', 'Lynx', 'Heron', 'Moth', 'Stag', 'Ray', 'Fox', 'Owl', 'Imp', 'Beetle', 'Wolf']
const SETS = ['QX2', 'BR7', 'LM4', 'TQ1', 'ZN5', 'VK3']
const OPENING: Kind[] = ['id', 'id', 'set', 'id', 'review', 'id', 'name', 'id', 'id', 'set', 'id', 'name', 'id', 'id', 'set', 'id', 'id', 'name', 'id', 'set', 'id', 'id']
const OPENING_GAP = 0.36
const TRICKLE_GAP = 2.4

function layout(w: number, h: number): Layout {
  if (h > w * 0.95) {
    const lx = w * 0.2
    const top = h * 0.22
    return {
      portrait: true,
      sources: [0, 1, 2, 3, 4].map((i) => [w * (0.09 + i * 0.095), h * 0.165] as [number, number]),
      entry: [lx, top],
      dir: [0, 1],
      gates: [0.38, 0.52, 0.66].map((f) => h * f - top),
      end: h * 0.72 - top,
      hold: 3,
      catalog: { x0: w * 0.62, y0: h * 0.3, x1: w * 0.95, y1: h * 0.8, cols: 5, rows: 7 },
      tray: { x: w * 0.06, y: h * 0.905, w: w * 0.52 },
      card: { w: 18, h: 25 },
    }
  }
  const ly = h * 0.47
  const ex = w * 0.16
  return {
    portrait: false,
    sources: [0, 1, 2, 3, 4].map((i) => [w * 0.07, h * (0.27 + i * 0.1)] as [number, number]),
    entry: [ex, ly],
    dir: [1, 0],
    gates: [0.335, 0.5, 0.665].map((f) => w * f - ex),
    end: w * 0.72 - ex,
    hold: 6,
    catalog: { x0: w * 0.77, y0: h * 0.2, x1: w * 0.955, y1: h * 0.82, cols: 6, rows: 8 },
    tray: { x: w * 0.29, y: h * 0.86, w: w * 0.4 },
    card: { w: 22, h: 30 },
  }
}

function create(api: SimApi): Sim {
  let L: Layout = layout(700, 500)
  let slots: Slot[] = []
  let size = { w: 0, h: 0 }
  const recs: Rec[] = []
  const reviews: Rec[] = []
  const pending: Pending[] = []
  const gates: Gate[] = [0, 1, 2].map(() => ({ busy: null, flash: 0, fail: 0, count: 0 }))
  const pulse = [0, 0, 0, 0, 0]
  const sent = [0, 0, 0, 0, 0]
  const waiting = [0, 0, 0]
  const ranks = [0, 0, 0]
  const meter: Meter = { score: 0, t: 0, hold: 0, done: false }
  const stats = { matched: 0 }
  let nextId = 1
  let filled = 0
  let spawnClock = 0
  let ambientClock = 0.3
  let opened = 0

  const pick = <T>(list: readonly T[]) => list[Math.floor(api.random() * list.length)]
  const gatePoint = (k: number): [number, number] => lanePoint(L.gates[k])

  function lanePoint(s: number): [number, number] {
    return [L.entry[0] + L.dir[0] * s, L.entry[1] + L.dir[1] * s]
  }

  function rebuild(w: number, h: number) {
    size = { w, h }
    L = layout(w, h)
    const { x0, y0, x1, y1, cols, rows } = L.catalog
    const old = slots
    slots = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        slots.push({ x: x0 + ((x1 - x0) * (c + 0.5)) / cols, y: y0 + ((y1 - y0) * (r + 0.5)) / rows, on: i < filled, flash: old[i]?.flash ?? 0 })
      }
  }

  function makeSet(kind: Kind): SetState {
    if (kind === 'set') return 'ok'
    if (kind === 'id') return api.random() < 0.75 ? 'ok' : 'missing'
    return api.random() < 0.5 ? 'missing' : 'conflict'
  }

  function makeScore(kind: Kind) {
    if (kind === 'name') return Math.round((0.91 + api.random() * 0.07) * 100) / 100
    if (kind === 'review') return Math.round((0.64 + api.random() * 0.21) * 100) / 100
    return 0
  }

  function spawn(item: Pending) {
    const [x, y] = L.sources[item.source]
    const rec: Rec = {
      id: nextId++,
      name: `${pick(ADJ)} ${pick(NOUN)}`,
      code: `${pick(SETS)} ${String(1 + Math.floor(api.random() * 198)).padStart(3, '0')}`,
      mid: item.kind === 'id' ? String(10000 + Math.floor(api.random() * 89999)) : null,
      set: makeSet(item.kind),
      score: makeScore(item.kind),
      source: item.source,
      batch: item.batch,
      notable: item.notable,
      x,
      y,
      state: 'lane',
      next: 0,
      t: 0,
      fx: 0,
      fy: 0,
      slot: -1,
    }
    recs.push(rec)
    pulse[item.source] = 1
    sent[item.source]++
  }

  function batchKinds(): Kind[] {
    const review = api.random() < 0.65 ? 1 : 0
    const name = 1 + (api.random() < 0.4 ? 1 : 0)
    const set = 2 + (api.random() < 0.35 ? 1 : 0)
    const kinds: Kind[] = []
    for (let i = 0; i < 12; i++) kinds.push(i < review ? 'review' : i < review + name ? 'name' : i < review + name + set ? 'set' : 'id')
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(api.random() * (i + 1))
      ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
    }
    return kinds
  }

  function feed() {
    const batch: Batch = { total: 12, done: 0, by: [0, 0, 0, 0], review: null }
    const offset = Math.floor(api.random() * 5)
    batchKinds().forEach((kind, i) => pending.push({ kind, source: (offset + i) % 5, batch, notable: false }))
    api.say('Batch of 12 records arriving from 5 sources.')
  }

  function feedAmbiguous() {
    const source = Math.floor(api.random() * 5)
    pending.unshift({ kind: 'review', source, batch: null, notable: true })
    api.say(`A record with no marketplace ID entered from source ${source + 1}.`)
  }

  function ambient(dt: number) {
    if (!api.ambient) return
    ambientClock -= dt
    if (ambientClock > 0 || waiting[0] >= L.hold) return
    const opening = opened < OPENING.length
    ambientClock = opening ? OPENING_GAP : TRICKLE_GAP
    const r = api.random()
    const kind = opening ? OPENING[opened++] : r < 0.64 ? 'id' : r < 0.84 ? 'set' : r < 0.95 ? 'name' : 'review'
    spawn({ kind, source: Math.floor(api.random() * 5), batch: null, notable: false })
  }

  function stepSpawns(dt: number) {
    spawnClock -= dt
    if (spawnClock > 0 || !pending.length || waiting[0] >= L.hold) return
    spawn(pending.shift()!)
    spawnClock = 0.28
  }

  function approach(r: Rec, x: number, y: number, dt: number, rate: number) {
    const k = 1 - Math.exp(-rate * dt)
    r.x += (x - r.x) * k
    r.y += (y - r.y) * k
    return Math.hypot(x - r.x, y - r.y)
  }

  function gap(k: number) {
    const along = (L.portrait ? L.card.h : L.card.w) + 5
    if (k > 0) return along
    return Math.max(7, Math.min(along, (L.gates[0] * 0.85) / Math.max(1, waiting[0])))
  }

  function full(k: number) {
    if (k > 1) return false
    const room = Math.max(1, Math.floor((L.gates[k + 1] - L.gates[k] - 16) / gap(k + 1)))
    return waiting[k + 1] >= room
  }

  function stepLane(r: Rec, dt: number) {
    const k = r.next
    const rank = ranks[k]++
    const gate = gates[k]
    if (rank === 0 && !gate.busy) {
      const [gx, gy] = gatePoint(k)
      if (approach(r, gx, gy, dt, 7) < 30) {
        gate.busy = r
        r.state = 'check'
        r.t = 0
      }
      return
    }
    const [x, y] = lanePoint(L.gates[k] - (rank + (gate.busy ? 1 : 0)) * gap(k))
    approach(r, x, y, dt, 7)
  }

  function stepCheck(r: Rec, dt: number) {
    const k = r.next
    const [gx, gy] = gatePoint(k)
    if (approach(r, gx, gy, dt, 11) < 8) r.t += dt
    if (k === 2) {
      meter.score = r.score
      meter.t = Math.min(1, r.t / (CHECK[2] * 0.85))
      meter.hold = 1.8
      meter.done = false
    }
    if (r.t >= CHECK[k] && (matches(r, k) || !full(k))) decide(r, k)
  }

  function matches(r: Rec, k: number) {
    if (k === 0) return r.mid !== null
    if (k === 1) return r.set === 'ok'
    return r.score >= ACCEPT
  }

  function decide(r: Rec, k: number) {
    const gate = gates[k]
    gate.busy = null
    if (k === 2) meter.done = true
    if (matches(r, k)) {
      gate.flash = 1
      gate.count++
      launch(r)
    } else if (k < 2) {
      r.next++
      r.state = 'lane'
    } else {
      gate.fail = 1
      r.state = 'drop'
    }
  }

  function launch(r: Rec) {
    r.state = 'fly'
    r.t = 0
    r.fx = r.x
    r.fy = r.y
    r.slot = filled < slots.length ? filled++ : Math.floor(api.random() * slots.length)
  }

  function flight(r: Rec, t: number): [number, number] {
    const s = slots[r.slot % slots.length]
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const cx = (r.fx + s.x) / 2
    const cy = Math.min(r.fy, s.y) - (L.portrait ? 46 : 76)
    const u = 1 - e
    return [u * u * r.fx + 2 * u * e * cx + e * e * s.x, u * u * r.fy + 2 * u * e * cy + e * e * s.y]
  }

  function stepFly(r: Rec, dt: number) {
    r.t = Math.min(1, r.t + dt / FLY)
    const [x, y] = flight(r, r.t)
    r.x = x
    r.y = y
    if (r.t < 1) return
    const s = slots[r.slot % slots.length]
    s.on = true
    s.flash = 1
    stats.matched++
    recs.splice(recs.indexOf(r), 1)
    finish(r, r.next)
  }

  function trayPoint(i: number, n: number): [number, number] {
    const { x, y, w } = L.tray
    const spacing = Math.min(L.card.w + 8, (w - L.card.w - 24) / Math.max(1, n - 1))
    return [x + 12 + L.card.w / 2 + i * spacing, y]
  }

  function stepDrop(r: Rec, dt: number) {
    const [x, y] = trayPoint(reviews.length, reviews.length + 1)
    if (approach(r, x, y, dt, 5) > 1.5) return
    r.state = 'review'
    recs.splice(recs.indexOf(r), 1)
    reviews.push(r)
    finish(r, 3)
  }

  function finish(r: Rec, outcome: number) {
    if (r.notable) api.say(sentence(r, outcome))
    const b = r.batch
    if (!b) return
    b.by[outcome]++
    b.done++
    if (outcome === 3) b.review = r
    if (b.done === b.total) api.say(summary(b))
  }

  function sentence(r: Rec, outcome: number) {
    const who = `${r.name}${r.set === 'missing' ? '' : ` (${r.code})`} from source ${r.source + 1}`
    if (outcome === 3) return `${who}: name score ${r.score.toFixed(2)}, below ${ACCEPT.toFixed(2)}; sent to the review queue instead of creating a duplicate.`
    if (outcome === 0) return `${who}: matched by marketplace ID.`
    if (outcome === 1) return `${who}: no marketplace ID; matched by set and number.`
    return `${who}: no marketplace ID or set match; name score ${r.score.toFixed(2)}, matched by name.`
  }

  function summary(b: Batch) {
    const parts = BY.flatMap((text, k) => (b.by[k] ? [`${b.by[k]} ${text}`] : []))
    const review = b.review ? `1 to review (${b.review.name}, name score ${b.review.score.toFixed(2)})` : 'none to review'
    parts.push(b.by[3] > 1 ? `${b.by[3]} to review` : review)
    return `Batch of ${b.total}: ${parts.join(', ')}.`
  }

  function stepRecords(dt: number) {
    waiting.fill(0)
    ranks.fill(0)
    for (const r of recs) if (r.state === 'lane') waiting[r.next]++
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i]
      if (r.state === 'lane') stepLane(r, dt)
      else if (r.state === 'check') stepCheck(r, dt)
      else if (r.state === 'fly') stepFly(r, dt)
      else if (r.state === 'drop') stepDrop(r, dt)
      if (recs[i] !== r) i--
    }
    reviews.forEach((r, i) => {
      const [x, y] = trayPoint(i, reviews.length)
      approach(r, x, y, dt, 6)
    })
  }

  function decay(dt: number) {
    for (const g of gates) {
      g.flash = Math.max(0, g.flash - dt * 1.5)
      g.fail = Math.max(0, g.fail - dt * 0.9)
    }
    for (let i = 0; i < 5; i++) pulse[i] = Math.max(0, pulse[i] - dt * 2.2)
    for (const s of slots) s.flash = Math.max(0, s.flash - dt * 1.2)
    if (meter.done) meter.hold = Math.max(0, meter.hold - dt)
  }

  return {
    step(dt) {
      if (!slots.length) return
      ambient(dt)
      stepSpawns(dt)
      stepRecords(dt)
      decay(dt)
    },

    draw(g, w, h, p) {
      if (w !== size.w || h !== size.h) rebuild(w, h)
      drawPaths(g, p)
      drawSources(g, p)
      drawCatalog(g, p)
      drawTray(g, p)
      drawGates(g, p, false)
      for (const r of recs) if (r.state === 'lane' || r.state === 'check') drawRec(g, p, r)
      drawGates(g, p, true)
      drawMeter(g, p)
      for (const r of recs) if (r.state === 'fly' || r.state === 'drop') drawRec(g, p, r)
      drawHud(g, w, p)
    },

    action(name) {
      if (name === 'feed') feed()
      else if (name === 'ambiguous') feedAmbiguous()
    },

    inspect(x, y) {
      return inspectRecord(x, y) ?? inspectReview(x, y) ?? inspectParts(x, y)
    },
  }

  function hit(r: Rec, x: number, y: number) {
    return Math.abs(r.x - x) < L.card.w / 2 + 4 && Math.abs(r.y - y) < L.card.h / 2 + 4
  }

  function setText(r: Rec) {
    if (r.set === 'missing') return 'no set number'
    return r.set === 'conflict' ? `${r.code}, conflicting` : r.code
  }

  function stageText(r: Rec) {
    if (r.state === 'fly') return `matched ${BY[r.next]}`
    if (r.state === 'drop') return 'going to review'
    const stage = ['marketplace ID', 'set and number', 'name score'][r.next]
    if (r.state === 'check') return r.next === 2 ? 'scoring the name' : `checking ${stage}`
    return r.next === 0 ? 'waiting for the ID check' : `no match yet; next ${stage}`
  }

  function inspectRecord(x: number, y: number) {
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i]
      if (hit(r, x, y)) return `${r.name}, ${setText(r)}, ${r.mid ? `ID ${r.mid}` : 'no ID'}: ${stageText(r)}`
    }
    return null
  }

  function inspectReview(x: number, y: number) {
    for (let i = reviews.length - 1; i >= 0; i--) {
      const r = reviews[i]
      if (!hit(r, x, y)) continue
      const set = r.set === 'missing' ? 'no set number' : 'set number conflicts'
      return `${r.name}: no ID, ${set}, score ${r.score.toFixed(2)} < ${ACCEPT.toFixed(2)}`
    }
    const { x: tx, y: ty, w } = L.tray
    if (x > tx && x < tx + w && Math.abs(y - ty) < 22) return `Review queue: ${reviews.length} waiting for a person`
    return null
  }

  function inspectParts(x: number, y: number) {
    for (let k = 0; k < 3; k++) {
      const [gx, gy] = gatePoint(k)
      if (Math.hypot(gx - x, gy - y) < 30) return `${STAGES[k]} stage: ${gates[k].count} matched here`
    }
    for (let i = 0; i < 5; i++) {
      const [sx, sy] = L.sources[i]
      if (Math.hypot(sx - x, sy - y) < 16) return `Source ${i + 1}: ${sent[i]} record${sent[i] === 1 ? '' : 's'} sent`
    }
    const c = L.catalog
    if (x > c.x0 - 6 && x < c.x1 + 6 && y > c.y0 - 6 && y < c.y1 + 6) {
      const on = Math.min(filled, slots.length)
      return `Catalog: ${on} of ${slots.length} sample cards matched`
    }
    return null
  }

  function drawPaths(g: CanvasRenderingContext2D, p: Palette) {
    const [ex, ey] = L.entry
    g.strokeStyle = alpha(p.purple, p.dark ? 0.22 : 0.18)
    g.lineWidth = 1.2
    for (const [sx, sy] of L.sources) {
      g.beginPath()
      g.moveTo(sx, sy)
      if (L.portrait) g.bezierCurveTo(sx, sy + 26, ex, ey - 26, ex, ey)
      else g.bezierCurveTo(sx + 40, sy, ex - 40, ey, ex, ey)
      g.stroke()
    }
    const [lx, ly] = lanePoint(L.end)
    g.strokeStyle = alpha(p.dot, p.dark ? 0.9 : 0.8)
    g.lineWidth = 2
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(ex, ey)
    g.lineTo(lx, ly)
    g.stroke()
    drawReviewPath(g, p)
    g.lineCap = 'butt'
  }

  function drawReviewPath(g: CanvasRenderingContext2D, p: Palette) {
    const [gx, gy] = gatePoint(2)
    const top = L.tray.y - (L.card.h + 14) / 2
    g.strokeStyle = alpha(p.red, 0.32)
    g.lineWidth = 1.2
    g.setLineDash([3, 4])
    g.beginPath()
    g.moveTo(gx, gy + (L.portrait ? 16 : 92))
    g.lineTo(gx, top - 2)
    g.stroke()
    g.setLineDash([])
  }

  function drawSources(g: CanvasRenderingContext2D, p: Palette) {
    L.sources.forEach(([x, y], i) => {
      if (pulse[i] > 0) glow(g, x, y, 30, p.purple, pulse[i])
      ball(g, x, y, L.portrait ? 9 : 10.5, p.purple, p.dark)
      if (!L.portrait) label(g, `Source ${i + 1}`, x, y + 21, p.muted, 11, 520, 'center')
    })
    if (L.portrait) {
      const [x, y] = L.sources[0]
      label(g, 'Sources', x - 9, y - 23, p.purple, 12, 560)
    }
  }

  function ring(g: CanvasRenderingContext2D, x: number, y: number, front: boolean) {
    const rx = L.portrait ? 26 : 9
    const ry = L.portrait ? 8 : 27
    const a0 = L.portrait ? 0 : Math.PI / 2
    g.beginPath()
    if (front) g.ellipse(x, y, rx, ry, 0, a0, a0 + Math.PI)
    else g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  }

  function drawGates(g: CanvasRenderingContext2D, p: Palette, front: boolean) {
    gates.forEach((gate, k) => {
      const [x, y] = gatePoint(k)
      if (!front) {
        if (gate.flash > 0) glow(g, x, y, 54, p.green, gate.flash)
        if (gate.fail > 0) glow(g, x, y, 54, p.red, gate.fail)
        g.strokeStyle = alpha(p.green, 0.32)
        g.lineWidth = 1.5
        ring(g, x, y, false)
        g.stroke()
        return
      }
      g.strokeStyle = gate.busy || gate.flash > 0.2 ? p.green : alpha(p.green, 0.78)
      g.lineWidth = 3
      g.lineCap = 'round'
      ring(g, x, y, true)
      g.stroke()
      g.lineCap = 'butt'
      gateLabel(g, p, k, x, y)
    })
  }

  function gateLabel(g: CanvasRenderingContext2D, p: Palette, k: number, x: number, y: number) {
    if (L.portrait) label(g, STAGES[k], x + 36, y + 13, p.green, 12, 560)
    else label(g, STAGES[k], x, y + 44, p.green, 12, 560, 'center')
  }

  function drawMeter(g: CanvasRenderingContext2D, p: Palette) {
    const [gx, gy] = gatePoint(2)
    const bw = L.portrait ? 62 : 72
    const bx = L.portrait ? gx + 36 : gx - bw / 2
    const by = L.portrait ? gy + 30 : gy + 64
    g.fillStyle = alpha(p.dot, p.dark ? 1 : 0.7)
    pill(g, bx, by - 2.5, bw, 5)
    g.fill()
    const live = meter.hold > 0
    if (live) {
      const k = Math.min(1, meter.hold / 0.6)
      const color = meter.done ? (meter.score >= ACCEPT ? p.green : p.red) : p.strong
      g.save()
      g.globalAlpha = k
      g.fillStyle = color
      pill(g, bx, by - 2.5, Math.max(5, bw * meter.score * (1 - Math.pow(1 - meter.t, 3))), 5)
      g.fill()
      tabular(g, (meter.score * (1 - Math.pow(1 - meter.t, 3))).toFixed(2), bx + bw + 7, by + 0.5, color, 11.5, 600)
      g.restore()
    }
    const tx = bx + bw * ACCEPT
    g.fillStyle = p.strong
    g.fillRect(tx - 0.75, by - 6, 1.5, 12)
    label(g, 'Accept at 0.90', L.portrait ? bx : gx, by + 15, p.muted, 11, 520, L.portrait ? 'left' : 'center')
  }

  function drawCatalog(g: CanvasRenderingContext2D, p: Palette) {
    const c = L.catalog
    const pw = (c.x1 - c.x0) / c.cols
    const ph = (c.y1 - c.y0) / c.rows
    const sw = Math.min(pw * 0.72, ph * 0.62)
    const sh = sw * 1.38
    const empty = alpha(p.ink, p.dark ? 0.06 : 0.05)
    const edge = alpha(p.ink, p.dark ? 0.16 : 0.18)
    const on = alpha(p.ink, p.dark ? 0.86 : 0.74)
    const bar = alpha(p.dark ? '#000000' : '#ffffff', 0.45)
    g.lineWidth = 1
    for (const s of slots) {
      if (s.flash > 0) glow(g, s.x, s.y, 26, p.green, s.flash)
      g.fillStyle = s.on ? on : empty
      pill(g, s.x - sw / 2, s.y - sh / 2, sw, sh, 3)
      g.fill()
      if (!s.on) {
        g.strokeStyle = edge
        g.stroke()
        continue
      }
      g.fillStyle = bar
      g.fillRect(s.x - sw * 0.3, s.y + sh * 0.12, sw * 0.6, 1.5)
      g.fillRect(s.x - sw * 0.3, s.y + sh * 0.26, sw * 0.4, 1.5)
    }
    label(g, 'Catalog', c.x0 + (pw - sw) / 2, c.y0 - 16, p.ink, 12, 560)
  }

  function drawTray(g: CanvasRenderingContext2D, p: Palette) {
    const { x, y, w } = L.tray
    const th = L.card.h + 14
    g.fillStyle = alpha(p.red, p.dark ? 0.1 : 0.07)
    g.strokeStyle = alpha(p.red, 0.6)
    g.lineWidth = 1.5
    pill(g, x, y - th / 2, w, th, 10)
    g.fill()
    g.stroke()
    if (L.portrait) label(g, 'Review queue', x + w - 4, y - th / 2 - 14, p.red, 12, 560, 'right')
    else label(g, 'Review queue', x + 4, y - th / 2 - 14, p.red, 12, 560)
    for (const r of reviews) drawCard(g, r.x, r.y, L.card.w, L.card.h, alpha(p.red, p.dark ? 0.22 : 0.14), p, r, p.red)
  }

  function drawRec(g: CanvasRenderingContext2D, p: Palette, r: Rec) {
    if (r.state === 'fly') {
      const s = Math.min(1, r.t * 1.1)
      const w = L.card.w * (1 - s * 0.2)
      drawCard(g, r.x, r.y, w, w * (L.card.h / L.card.w), mix(p.blue, p.ink, s * s), p, r, null)
      return
    }
    if (r.state === 'drop') {
      drawCard(g, r.x, r.y, L.card.w, L.card.h, mix(p.blue, p.red, 0.7), p, r, null)
      return
    }
    drawCard(g, r.x, r.y, L.card.w, L.card.h, p.blue, p, r, null)
  }

  function drawCard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, p: Palette, r: Rec, edge: string | null) {
    const x0 = x - w / 2
    const y0 = y - h / 2
    g.fillStyle = alpha('#000000', p.dark ? 0.35 : 0.12)
    pill(g, x0, y0 + 1.5, w, h, 3.5)
    g.fill()
    g.fillStyle = fill
    pill(g, x0, y0, w, h, 3.5)
    g.fill()
    if (edge) {
      g.strokeStyle = edge
      g.lineWidth = 1.4
      g.stroke()
    }
    drawFields(g, x0, y0, w, h, p, r, edge)
  }

  function drawFields(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, p: Palette, r: Rec, edge: string | null) {
    const ink = edge ?? (p.dark ? mix(p.blue, '#0a0c10', 0.78) : '#ffffff')
    const faint = alpha(edge ?? (p.dark ? '#0a0c10' : '#ffffff'), 0.3)
    const bx = x0 + w * 0.2
    const bh = Math.max(1.6, h * 0.075)
    g.fillStyle = r.mid ? ink : faint
    g.fillRect(bx, y0 + h * 0.24, w * 0.42, bh)
    g.fillStyle = r.set === 'ok' ? ink : r.set === 'conflict' ? p.amber : faint
    g.fillRect(bx, y0 + h * 0.44, w * 0.56, bh)
    g.fillStyle = ink
    g.fillRect(bx, y0 + h * 0.64, w * 0.62, bh)
  }

  function drawHud(g: CanvasRenderingContext2D, w: number, p: Palette) {
    const y = 22
    const x = 20
    label(g, 'Simulated', x, y, p.muted, 11.5, 520)
    const parts = [`${stats.matched.toLocaleString('en-US')} matched`, `${reviews.length} in review`]
    let cx = x + 74
    for (const part of parts) {
      tabular(g, part, cx, y, p.strong, 12, 560)
      g.font = `560 12px "Mona Sans"`
      cx += g.measureText(part).width + 22
      if (cx > w - 40) break
    }
  }
}

export function mount(figure: HTMLElement) {
  mountSim(figure, create)
}
