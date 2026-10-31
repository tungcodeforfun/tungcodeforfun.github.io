import type { Koi } from '../koi/koi.ts'
import { TAU, smooth } from '../koi/math.ts'

export type Surface = {
  measure(): void
  part(fish: readonly Koi[], strength: number, band: boolean, now: number): void
  still(): void
}

export const SWELL = 5
const REACH = 0.35
const WAVELENGTH = 1.2
const PERIOD = 1400
const RISE = 160
const SETTLE = 480
const QUIET_BAND = [0.22, 0.78]

export function createSurface(root: HTMLElement): Surface {
  let words: HTMLElement[] = []
  let xs = new Float64Array(0)
  let ys = new Float64Array(0)
  let dy = new Float32Array(0)
  let goal = new Float32Array(0)
  let level = new Float32Array(0)
  let along = new Float32Array(0)
  let stamp = new Uint32Array(0)
  let frame = 0
  let last = 0
  const active = new Set<number>()
  const box = { x0: 0, y0: 0, x1: 0, y1: 0 }

  function still() {
    for (const i of active) {
      words[i].style.translate = ''
      dy[i] = level[i] = 0
    }
    active.clear()
  }

  function measure() {
    still()
    words = [...root.querySelectorAll<HTMLElement>('.w')]
    xs = new Float64Array(words.length)
    ys = new Float64Array(words.length)
    dy = new Float32Array(words.length)
    goal = new Float32Array(words.length)
    level = new Float32Array(words.length)
    along = new Float32Array(words.length)
    stamp = new Uint32Array(words.length)
    words.forEach((w, i) => {
      const r = w.getBoundingClientRect()
      xs[i] = r.left + r.width / 2 + scrollX
      ys[i] = r.top + r.height / 2 + scrollY
    })
  }

  function first(y: number) {
    let lo = 0
    let hi = ys.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ys[mid] < y) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  function bounds(k: Koi, reach: number) {
    const c = k.chain
    box.x0 = box.y0 = Infinity
    box.x1 = box.y1 = -Infinity
    for (let j = 0; j < c.length; j += 2) {
      box.x0 = Math.min(box.x0, c[j])
      box.x1 = Math.max(box.x1, c[j])
      box.y0 = Math.min(box.y0, c[j + 1])
      box.y1 = Math.max(box.y1, c[j + 1])
    }
    box.x0 -= reach
    box.y0 -= reach
    box.x1 += reach
    box.y1 += reach
  }

  function set(i: number, y: number) {
    if (y ? Math.abs(y - dy[i]) < 0.04 : !dy[i]) return
    dy[i] = y
    words[i].style.translate = y ? `0 ${y.toFixed(2)}px` : ''
  }

  function touch(k: Koi, top: number, height: number, band: boolean) {
    const reach = k.length * REACH
    const c = k.chain
    const ux = Math.cos(k.heading) / (k.length * WAVELENGTH)
    const uy = Math.sin(k.heading) / (k.length * WAVELENGTH)
    bounds(k, reach)
    for (let i = first(box.y0 + top); i < ys.length && ys[i] - top <= box.y1; i++) {
      const x = xs[i] - scrollX
      const y = ys[i] - top
      if (x < box.x0 || x > box.x1) continue
      let near = Infinity
      for (let j = 0; j < c.length; j += 2) near = Math.min(near, Math.hypot(x - c[j], y - c[j + 1]))
      if (near >= reach) continue
      const pull = (1 - smooth(near / reach)) * (band ? quietness(y / height) : 1)
      if (stamp[i] !== frame) {
        stamp[i] = frame
        goal[i] = 0
        active.add(i)
      }
      if (pull > goal[i]) {
        goal[i] = pull
        along[i] = (x - c[0]) * ux + (y - c[1]) * uy
      }
    }
  }

  function part(fish: readonly Koi[], strength: number, band: boolean, now: number) {
    const dt = Math.min(50, now - last)
    last = now
    if (strength <= 0) return still()
    frame++
    for (const k of fish) touch(k, scrollY, innerHeight, band)
    const phase = (TAU * now) / PERIOD
    for (const i of active) {
      const want = stamp[i] === frame ? goal[i] : 0
      level[i] = want > level[i] ? Math.min(want, level[i] + dt / RISE) : Math.max(want, level[i] - dt / SETTLE)
      if (level[i]) set(i, SWELL * smooth(level[i]) * strength * Math.sin(phase + TAU * along[i]))
      else {
        set(i, 0)
        active.delete(i)
      }
    }
  }

  function quietness(t: number) {
    const [a, b] = QUIET_BAND
    if (t <= a) return Math.min(1, (a - t) / 0.08)
    if (t >= b) return Math.min(1, (t - b) / 0.08)
    return 0
  }

  return { measure, part, still }
}
