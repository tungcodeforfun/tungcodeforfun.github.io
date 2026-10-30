import type { Koi } from '../koi/koi.ts'

export type Surface = {
  measure(): void
  part(fish: readonly Koi[], strength: number, band: boolean): void
  still(): void
}

const LIFT = 2.4
const REACH = 0.15
const QUIET_BAND = [0.22, 0.78]

export function createSurface(root: HTMLElement): Surface {
  let words: HTMLElement[] = []
  let xs = new Float64Array(0)
  let ys = new Float64Array(0)
  let dx = new Float32Array(0)
  let dy = new Float32Array(0)
  let tx = new Float32Array(0)
  let ty = new Float32Array(0)
  let stamp = new Uint32Array(0)
  let frame = 0
  const hits: number[] = []
  const moved = new Set<number>()
  const box = { x0: 0, y0: 0, x1: 0, y1: 0 }

  function still() {
    for (const i of moved) {
      words[i].style.translate = ''
      dx[i] = dy[i] = 0
    }
    moved.clear()
  }

  function measure() {
    still()
    words = [...root.querySelectorAll<HTMLElement>('.w')]
    xs = new Float64Array(words.length)
    ys = new Float64Array(words.length)
    dx = new Float32Array(words.length)
    dy = new Float32Array(words.length)
    tx = new Float32Array(words.length)
    ty = new Float32Array(words.length)
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

  function set(i: number, x: number, y: number) {
    if (Math.abs(x - dx[i]) < 0.04 && Math.abs(y - dy[i]) < 0.04) return
    dx[i] = x
    dy[i] = y
    if (x || y) {
      words[i].style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`
      moved.add(i)
    } else {
      words[i].style.translate = ''
      moved.delete(i)
    }
  }

  function part(fish: readonly Koi[], strength: number, band: boolean) {
    if (strength <= 0) return still()
    const top = scrollY
    const height = innerHeight
    frame++
    for (const k of fish) {
      const reach = k.length * REACH
      bounds(k, reach)
      const c = k.chain
      for (let i = first(box.y0 + top); i < ys.length && ys[i] - top <= box.y1; i++) {
        const x = xs[i] - scrollX
        const y = ys[i] - top
        if (x < box.x0 || x > box.x1) continue
        let near = Infinity
        let nx = 0
        let ny = 0
        for (let j = 0; j < c.length; j += 2) {
          const d = Math.hypot(x - c[j], y - c[j + 1])
          if (d < near) {
            near = d
            nx = x - c[j]
            ny = y - c[j + 1]
          }
        }
        if (near >= reach) continue
        const f = (1 - near / reach) ** 2 * strength * (band ? quietness(y / height) : 1) * LIFT
        if (stamp[i] !== frame) {
          stamp[i] = frame
          tx[i] = ty[i] = 0
          hits.push(i)
        }
        tx[i] += near ? (nx / near) * f : 0
        ty[i] += near ? (ny / near) * f * 0.5 : 0
      }
    }
    for (const i of moved) if (stamp[i] !== frame) set(i, 0, 0)
    for (const i of hits) set(i, tx[i], ty[i])
    hits.length = 0
  }

  function quietness(t: number) {
    const [a, b] = QUIET_BAND
    if (t <= a) return Math.min(1, (a - t) / 0.08)
    if (t >= b) return Math.min(1, (t - b) / 0.08)
    return 0
  }

  return { measure, part, still }
}
