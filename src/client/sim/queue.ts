import type { Palette } from '../palette'
import { alpha, ball, glow, label, mix, pill, tabular } from './draw'
import { mountSim, type Sim, type SimApi } from './stage'

type MsgState = 'queued' | 'toWorker' | 'working' | 'invisible' | 'toDlq' | 'dead'
type Msg = {
  id: number
  x: number
  y: number
  state: MsgState
  attempts: number
  poison: boolean
  band: number
  worker: number
  t: number
}
type Worker = { busy: Msg | null; t: number; fail: number }
type Dot = { x: number; y: number; applied: number; flash: number; miss: number }
type Spark = { from: [number, number]; dot: number; t: number; dur: number }
type Call = { dot: number; t: number; latency: number; state: 'open' | 'ok' | 'timeout' }
type Layout = {
  source: [number, number]
  lane: { x0: number; x1: number; y: number }
  workers: [number, number][]
  field: { x0: number; y0: number; x1: number; y1: number; cols: number; rows: number }
  dlq: { x: number; y: number; w: number }
  pager: [number, number]
  portrait: boolean
}

const MAX_ATTEMPTS = 3
const WORK_TIME = 0.75
const VISIBILITY = 1.7
const BAND = 18
const BATCH = 4
const GATEWAY_TIMEOUT = 5
const TRANSIENT = 0.07

function layout(w: number, h: number): Layout {
  const portrait = h > w * 0.95
  if (portrait) {
    const fieldTop = h * 0.47
    return {
      portrait,
      source: [w * 0.1, h * 0.2],
      lane: { x0: w * 0.22, x1: w * 0.92, y: h * 0.2 },
      workers: [0.3, 0.57, 0.84].map((x) => [w * x, h * 0.34] as [number, number]),
      field: { x0: w * 0.08, y0: fieldTop, x1: w * 0.92, y1: h * 0.77, cols: 18, rows: 11 },
      dlq: { x: w * 0.08, y: h * 0.89, w: w * 0.46 },
      pager: [w * 0.8, h * 0.88],
    }
  }
  return {
    portrait,
    source: [w * 0.075, h * 0.4],
    lane: { x0: w * 0.15, x1: w * 0.47, y: h * 0.4 },
    workers: [-1, 0, 1].map((k) => [w * 0.56, h * 0.4 + k * h * 0.15] as [number, number]),
    field: { x0: w * 0.66, y0: h * 0.13, x1: w * 0.94, y1: h * 0.8, cols: 14, rows: 18 },
    dlq: { x: w * 0.18, y: h * 0.78, w: w * 0.3 },
    pager: [w * 0.56, h * 0.85],
  }
}

function create(api: SimApi): Sim {
  let L: Layout = layout(700, 500)
  let dots: Dot[] = []
  const msgs: Msg[] = []
  const workers: Worker[] = [0, 1, 2].map(() => ({ busy: null, t: 0, fail: 0 }))
  const sparks: Spark[] = []
  let calls: Call[] = []
  let sync = false
  let syncClock = 0
  let userRun = false
  let nextId = 1
  let nextBand = 0
  let ambientClock = 0.4
  let alarm = 0
  let pager = 0
  const stats = { applied: 0, retried: 0, dead: 0, timedOut: 0, calls: 0 }
  let size = { w: 0, h: 0 }

  const bands = () => Math.max(1, Math.floor(dots.length / BAND))
  const queued = () => msgs.filter((m) => m.state === 'queued')
  const slotX = (i: number, count: number) => L.lane.x1 - 18 - i * Math.min(22, (L.lane.x1 - L.lane.x0 - 24) / Math.max(10, count))

  function rebuild(w: number, h: number) {
    size = { w, h }
    L = layout(w, h)
    const { x0, y0, x1, y1, cols, rows } = L.field
    const old = dots
    dots = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        dots.push({
          x: x0 + ((x1 - x0) * c) / (cols - 1),
          y: y0 + ((y1 - y0) * r) / (rows - 1),
          applied: old[i]?.applied ?? 0,
          flash: 0,
          miss: 0,
        })
      }
  }

  function enqueue(poison: boolean) {
    const m: Msg = {
      id: nextId++,
      x: L.source[0],
      y: L.source[1],
      state: 'queued',
      attempts: 0,
      poison,
      band: nextBand++ % bands(),
      worker: -1,
      t: 0,
    }
    msgs.push(m)
    return m
  }

  function sendBatch() {
    if (sync) {
      startSyncCall()
      return
    }
    for (let i = 0; i < BATCH; i++) enqueue(false)
  }

  function startSyncCall() {
    if (calls.some((c) => c.state === 'open')) return
    const band = nextBand++ % bands()
    const first = (band * BAND * 2) % dots.length
    calls = Array.from({ length: BAND * 2 }, (_, i) => ({
      dot: (first + i) % dots.length,
      t: 0,
      latency: 0.4 + Math.pow(api.random(), 3) * 9,
      state: 'open' as const,
    }))
    syncClock = 0
  }

  function deliver(m: Msg, from: [number, number]) {
    const start = m.band * BAND
    for (let i = 0; i < BAND; i++) {
      const dot = (start + i) % dots.length
      sparks.push({ from, dot, t: -i * 0.02, dur: 0.45 + api.random() * 0.25 })
    }
  }

  function finishWork(k: number) {
    const wk = workers[k]
    const m = wk.busy!
    wk.busy = null
    m.attempts++
    const failed = m.poison || (m.attempts === 1 && api.random() < TRANSIENT)
    if (!failed) {
      deliver(m, L.workers[k])
      msgs.splice(msgs.indexOf(m), 1)
      return
    }
    wk.fail = 1
    if (m.attempts >= MAX_ATTEMPTS) {
      m.state = 'toDlq'
      m.t = 0
      return
    }
    m.state = 'invisible'
    m.t = VISIBILITY
    stats.retried++
    if (m.poison) api.say(`The poisoned message failed on attempt ${m.attempts} of ${MAX_ATTEMPTS}; it becomes visible again after the timeout.`)
  }

  function approach(m: Msg, x: number, y: number, dt: number, rate = 9) {
    const k = 1 - Math.exp(-rate * dt)
    m.x += (x - m.x) * k
    m.y += (y - m.y) * k
    return Math.hypot(x - m.x, y - m.y) < 1.5
  }

  function assignWorkers(q: Msg[]) {
    const front = slotX(0, q.length)
    for (let k = 0; k < workers.length; k++) {
      const worker = workers[k]
      if (worker.busy) continue
      const head = q.find((m) => m.state === 'queued' && Math.abs(m.x - front) < 30)
      if (!head) continue
      head.state = 'toWorker'
      head.worker = k
      worker.busy = head
      q.splice(q.indexOf(head), 1)
    }
  }

  function stepInvisible(m: Msg, dt: number) {
    m.t -= dt
    approach(m, (L.lane.x0 + L.lane.x1) / 2, L.lane.y + (L.portrait ? 30 : -34), dt, 3)
    if (m.t > 0) return
    m.state = 'queued'
    msgs.splice(msgs.indexOf(m), 1)
    msgs.push(m)
  }

  function stepToDlq(m: Msg, dt: number, parked: number) {
    m.t += dt
    if (!approach(m, L.dlq.x + 26 + parked * 20, L.dlq.y, dt, 4.5)) return
    m.state = 'dead'
    stats.dead++
    alarm = 1
    pager = 2.4
    api.say(`After ${MAX_ATTEMPTS} attempts the poisoned message moved to the dead-letter queue. The alarm paged on-call; other messages kept flowing.`)
  }

  function stepMessage(m: Msg, dt: number, parked: number) {
    if (m.state === 'toWorker') {
      const [x, y] = L.workers[m.worker]
      if (approach(m, x, y, dt, 10)) {
        m.state = 'working'
        workers[m.worker].t = 0
      }
    } else if (m.state === 'working') {
      workers[m.worker].t += dt
      if (workers[m.worker].t >= WORK_TIME) finishWork(m.worker)
    } else if (m.state === 'invisible') stepInvisible(m, dt)
    else if (m.state === 'toDlq') stepToDlq(m, dt, parked)
  }

  function stepQueue(dt: number) {
    const q = queued()
    q.forEach((m, i) => approach(m, slotX(i, q.length), L.lane.y, dt, 7))
    for (const worker of workers) worker.fail = Math.max(0, worker.fail - dt * 1.6)
    assignWorkers(q)
    let parked = 0
    for (const m of msgs) if (m.state === 'dead') parked++
    for (const m of msgs) stepMessage(m, dt, parked)
  }

  function stepSync(dt: number) {
    if (!calls.length) return
    syncClock += dt
    let open = 0
    for (const c of calls) {
      if (c.state !== 'open') continue
      c.t += dt
      if (c.t >= c.latency) {
        c.state = 'ok'
        dots[c.dot].applied++
        dots[c.dot].flash = 1
        stats.applied++
      } else if (syncClock >= GATEWAY_TIMEOUT) {
        c.state = 'timeout'
        dots[c.dot].miss = 1
        stats.timedOut++
      } else open++
    }
    if (!open && calls.some((c) => c.state !== 'open') && syncClock < GATEWAY_TIMEOUT + 2) {
      const failed = calls.filter((c) => c.state === 'timeout').length
      stats.calls += calls.length
      if (userRun && syncClock < GATEWAY_TIMEOUT + 1) {
        api.say(
          failed
            ? `Synchronous run finished: ${failed} of ${calls.length} simulated calls timed out.`
            : `Synchronous run finished: all ${calls.length} calls returned before the timeout.`,
        )
      }
      userRun = false
      syncClock = GATEWAY_TIMEOUT + 2
    }
  }

  return {
    step(dt) {
      if (!dots.length) return
      ambientClock -= dt
      if (ambientClock <= 0 && api.ambient) {
        ambientClock = sync ? 7 : 2.6
        sendBatch()
      }
      stepQueue(dt)
      stepSync(dt)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.t += dt
        if (s.t >= s.dur) {
          const d = dots[s.dot]
          d.applied++
          d.flash = 1
          stats.applied++
          sparks.splice(i, 1)
        }
      }
      for (const d of dots) {
        d.flash = Math.max(0, d.flash - dt * 1.4)
        d.miss = Math.max(0, d.miss - dt * 0.25)
      }
      alarm = Math.max(0, alarm - dt * 0.45)
      pager = Math.max(0, pager - dt)
    },

    draw(g, w, h, p) {
      if (w !== size.w || h !== size.h) rebuild(w, h)
      drawField(g, p)
      if (sync) drawSync(g, p)
      drawQueue(g, p)
      drawWorkers(g, p)
      drawDlq(g, p)
      for (const s of sparks) {
        if (s.t < 0) continue
        const d = dots[s.dot]
        const k = s.t / s.dur
        const e = 1 - Math.pow(1 - k, 3)
        const x = s.from[0] + (d.x - s.from[0]) * e
        const y = s.from[1] + (d.y - s.from[1]) * e - Math.sin(k * Math.PI) * 18
        g.fillStyle = p.blue
        g.beginPath()
        g.arc(x, y, 2, 0, Math.PI * 2)
        g.fill()
      }
      drawMessages(g, p)
      drawHud(g, w, p)
    },

    action(name, value) {
      if (name === 'batch') {
        sendBatch()
        userRun = sync
        api.say(sync ? 'Synchronous run started: the simulated caller waits on each location call.' : `Batch sent: ${BATCH} messages queued.`)
      } else if (name === 'poison') {
        if (sync) {
          api.say('Switch to SQS batches to see a poisoned message retried and dead-lettered.')
          return
        }
        enqueue(true)
        api.say('A poisoned message entered the queue.')
      } else if (name === 'mode') {
        sync = value === 1
        calls = []
        ambientClock = 0.3
        api.say(
          sync
            ? 'Synchronous HTTP: the simulated caller waits on each location call, and slow calls time out.'
            : 'SQS batches: messages wait in the queue and workers apply them.',
        )
      }
    },

    inspect(x, y) {
      for (const m of msgs) {
        if (Math.hypot(m.x - x, m.y - y) < 12) {
          if (m.state === 'dead') return `Message ${m.id}: dead-lettered after ${m.attempts} attempts`
          return `Message ${m.id}: ${m.attempts ? `attempt ${m.attempts + 1} of ${MAX_ATTEMPTS}` : 'first attempt'}`
        }
      }
      for (let k = 0; k < workers.length; k++) {
        const [wx, wy] = L.workers[k]
        if (Math.hypot(wx - x, wy - y) < 22) {
          const m = workers[k].busy
          return m ? `Worker ${k + 1}: applying message ${m.id}` : `Worker ${k + 1}: idle`
        }
      }
      if (x > L.dlq.x - 10 && x < L.dlq.x + L.dlq.w + 10 && Math.abs(y - L.dlq.y) < 22) {
        return `Dead-letter queue: ${stats.dead} message${stats.dead === 1 ? '' : 's'}`
      }
      let best = -1
      let bestD = 14
      dots.forEach((d, i) => {
        const dd = Math.hypot(d.x - x, d.y - y)
        if (dd < bestD) {
          bestD = dd
          best = i
        }
      })
      if (best >= 0) {
        const d = dots[best]
        return `Location group ${best + 1}: ${d.applied} change${d.applied === 1 ? '' : 's'} applied`
      }
      return null
    },
  }

  function drawField(g: CanvasRenderingContext2D, p: Palette) {
    const r = L.portrait ? 3.4 : 3.8
    const applied = mix(p.dot, p.blue, 0.38)
    for (const d of dots) {
      g.fillStyle = d.miss > 0 ? mix(d.applied ? applied : p.dot, p.red, Math.min(1, d.miss * 1.4)) : d.applied ? applied : p.dot
      g.beginPath()
      g.arc(d.x, d.y, r, 0, Math.PI * 2)
      g.fill()
      if (d.flash > 0) {
        glow(g, d.x, d.y, 14, p.blue, d.flash)
        g.fillStyle = alpha(p.blue, d.flash)
        g.beginPath()
        g.arc(d.x, d.y, r + 0.6, 0, Math.PI * 2)
        g.fill()
      }
    }
    const { x0, y0 } = L.field
    label(g, 'Locations', L.portrait ? x0 : x0 - 4, y0 - 20, p.muted, 12, 520)
  }

  function drawSync(g: CanvasRenderingContext2D, p: Palette) {
    const [sx, sy] = L.source
    for (const c of calls) {
      const d = dots[c.dot]
      if (c.state === 'ok') continue
      const k = c.state === 'open' ? Math.min(1, c.t / c.latency) : 1
      g.strokeStyle = c.state === 'timeout' ? alpha(p.red, 0.5) : alpha(p.blue, 0.35)
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(sx, sy)
      g.lineTo(sx + (d.x - sx) * k, sy + (d.y - sy) * k)
      g.stroke()
      if (c.state === 'timeout') {
        g.strokeStyle = p.red
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(d.x - 4, d.y - 4)
        g.lineTo(d.x + 4, d.y + 4)
        g.moveTo(d.x + 4, d.y - 4)
        g.lineTo(d.x - 4, d.y + 4)
        g.stroke()
      }
    }
    if (calls.length && syncClock <= GATEWAY_TIMEOUT) {
      const k = Math.min(1, syncClock / GATEWAY_TIMEOUT)
      g.strokeStyle = k > 0.8 ? p.red : p.muted
      g.lineWidth = 3
      g.lineCap = 'round'
      g.beginPath()
      g.arc(sx, sy, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2)
      g.stroke()
      g.lineCap = 'butt'
      label(g, 'Gateway timeout', sx, sy + 44, p.muted, 11.5, 520, 'center')
    }
  }

  function drawQueue(g: CanvasRenderingContext2D, p: Palette) {
    const { x0, x1, y } = L.lane
    const fade = sync ? 0.35 : 1
    g.save()
    g.globalAlpha = fade
    g.fillStyle = alpha(p.orange, p.dark ? 0.1 : 0.08)
    g.strokeStyle = alpha(p.orange, 0.75)
    g.lineWidth = 1.5
    pill(g, x0, y - 19, x1 - x0, 38)
    g.fill()
    g.stroke()
    label(g, 'Queue', x0 + 4, y - 34, p.orange, 12, 560)
    const [sx, sy] = L.source
    ball(g, sx, sy, 15, p.blue, p.dark)
    label(g, 'Changes', sx, sy + (L.portrait ? 28 : 30), p.muted, 11.5, 520, 'center')
    g.restore()
  }

  function drawWorkers(g: CanvasRenderingContext2D, p: Palette) {
    g.save()
    g.globalAlpha = sync ? 0.35 : 1
    workers.forEach((wk, k) => {
      const [x, y] = L.workers[k]
      if (wk.fail > 0) glow(g, x, y, 46, p.red, wk.fail)
      ball(g, x, y, 17, wk.fail > 0.5 ? p.red : p.green, p.dark)
      if (wk.busy?.state === 'working') {
        g.strokeStyle = p.strong
        g.lineWidth = 2
        g.lineCap = 'round'
        g.beginPath()
        g.arc(x, y, 23, -Math.PI / 2, -Math.PI / 2 + (wk.t / WORK_TIME) * Math.PI * 2)
        g.stroke()
        g.lineCap = 'butt'
      }
    })
    const [lx, ly] = L.workers[0]
    label(g, 'Workers', lx, ly - 36, p.green, 12, 560, L.portrait ? 'left' : 'center')
    g.restore()
  }

  function drawDlq(g: CanvasRenderingContext2D, p: Palette) {
    const { x, y, w } = L.dlq
    if (alarm > 0) {
      for (let i = 0; i < 3; i++) {
        const k = (1 - alarm + i * 0.22) % 1
        g.strokeStyle = alpha(p.red, (1 - k) * alarm)
        g.lineWidth = 1.5
        pill(g, x - k * 30, y - 19 - k * 30, w + k * 60, 38 + k * 60, 19 + k * 30)
        g.stroke()
      }
    }
    g.fillStyle = alpha(p.red, p.dark ? 0.12 : 0.08)
    g.strokeStyle = alpha(p.red, 0.7)
    g.lineWidth = 1.5
    pill(g, x, y - 19, w, 38)
    g.fill()
    g.stroke()
    label(g, 'Dead-letter queue', x + 4, y - 34, p.red, 12, 560)
    const [px, py] = L.pager
    const shake = pager > 0 ? Math.sin(pager * 60) * 2.2 : 0
    g.save()
    g.translate(px + shake, py)
    g.fillStyle = pager > 0 ? p.red : p.dot
    pill(g, -11, -16, 22, 32, 6)
    g.fill()
    g.fillStyle = p.dark ? p.bg : '#ffffff'
    pill(g, -7, -11, 14, 10, 2)
    g.fill()
    g.restore()
    label(g, pager > 0 ? 'On-call paged' : 'On-call', px, py + 30, pager > 0 ? p.red : p.muted, 11.5, 540, 'center')
  }

  function drawMessages(g: CanvasRenderingContext2D, p: Palette) {
    for (const m of msgs) {
      const ghost = m.state === 'invisible'
      g.save()
      g.globalAlpha = ghost ? 0.45 : 1
      const color = m.state === 'dead' || m.state === 'toDlq' ? p.red : p.blue
      const s = 13
      g.fillStyle = color
      pill(g, m.x - s / 2, m.y - s / 2, s, s, 4)
      g.fill()
      if (m.poison && m.state !== 'dead') {
        g.strokeStyle = p.red
        g.lineWidth = 2
        pill(g, m.x - s / 2 - 2.5, m.y - s / 2 - 2.5, s + 5, s + 5, 6)
        g.stroke()
      }
      for (let i = 0; i < m.attempts && m.state !== 'dead'; i++) {
        g.fillStyle = p.red
        g.beginPath()
        g.arc(m.x - 5 + i * 5, m.y + 13, 1.8, 0, Math.PI * 2)
        g.fill()
      }
      if (ghost) {
        g.strokeStyle = p.strong
        g.lineWidth = 1.5
        g.beginPath()
        g.arc(m.x, m.y, 12, -Math.PI / 2, -Math.PI / 2 + (m.t / VISIBILITY) * Math.PI * 2)
        g.stroke()
      }
      g.restore()
    }
  }

  function drawHud(g: CanvasRenderingContext2D, w: number, p: Palette) {
    const y = 22
    const x = 20
    label(g, 'Simulated', x, y, p.muted, 11.5, 520)
    const parts = sync
      ? [`${stats.applied.toLocaleString('en-US')} applied`, `${stats.timedOut.toLocaleString('en-US')} timed out`]
      : [
          `${stats.applied.toLocaleString('en-US')} applied`,
          `${stats.retried} retried`,
          `${stats.dead} dead-lettered`,
        ]
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
