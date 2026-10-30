import type { Grid } from '../koi/grid.ts'

export type Block = { x: number; y: number; w: number; h: number }

export type Water = {
  readInks(): void
  resize(width: number, height: number, fontSize: number): void
  draw(grid: Grid, blocks: readonly Block[]): void
}

const INKS = 8
const LEVELS = 3
const FEATHER = 18
const LIGHT_FLOOR = 0.86
const DARK_CEILING = 0.028

type Rgb = [number, number, number]

function rgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: Rgb) {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`

function submerge(ink: Rgb, bg: Rgb) {
  const light = luminance(bg) > 0.5
  const ok = (c: Rgb) => (light ? luminance(c) >= LIGHT_FLOOR : luminance(c) <= DARK_CEILING)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const t = (lo + hi) / 2
    if (ok(mix(ink, bg, t))) hi = t
    else lo = t
  }
  return mix(ink, bg, hi)
}

export function createWater(canvas: HTMLCanvasElement): Water | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const glyphs = new Map<number, string>()
  let styles: string[] = []
  let width = 0
  let height = 0
  let pad = 0
  let keys = new Uint8Array(0)
  let sorted = new Uint8Array(0)
  let order = new Int32Array(0)
  const counts = new Int32Array(INKS * LEVELS + 1)

  function readInks() {
    const style = getComputedStyle(document.documentElement)
    const bg = rgb(style.getPropertyValue('--bg').trim())
    styles = []
    for (let ink = 1; ink <= INKS; ink++) {
      const full = rgb(style.getPropertyValue(`--k${ink}`).trim())
      const deep = submerge(full, bg)
      styles.push(css(full), css(mix(full, deep, 0.55)), css(deep))
    }
  }

  function resize(w: number, h: number, fontSize: number) {
    width = w
    height = h
    const dpr = Math.min(devicePixelRatio || 1, 3)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.font = `${fontSize}px 'Koi Mono', ui-monospace, monospace`
    ctx!.textAlign = 'center'
    ctx!.textBaseline = 'middle'
    pad = Math.ceil(fontSize * 0.6) + 2
  }

  function depth(x: number, y: number, blocks: readonly Block[]) {
    let best = Infinity
    for (const b of blocks) {
      const dx = Math.max(b.x - pad - x, 0, x - b.x - b.w - pad)
      const dy = Math.max(b.y - pad - y, 0, y - b.y - b.h - pad)
      if (!dx && !dy) return LEVELS - 1
      best = Math.min(best, Math.hypot(dx, dy))
    }
    return best < FEATHER ? 1 : 0
  }

  function draw(grid: Grid, blocks: readonly Block[]) {
    const c = ctx!
    c.clearRect(0, 0, width, height)
    if (keys.length < grid.count) {
      keys = new Uint8Array(grid.used.length)
      sorted = new Uint8Array(grid.used.length)
      order = new Int32Array(grid.used.length)
    }
    counts.fill(0)
    for (let n = 0; n < grid.count; n++) {
      const cell = grid.used[n]
      const col = cell % grid.cols
      const row = (cell - col) / grid.cols
      const key = (grid.ink[cell] - 1) * LEVELS + depth((col + 0.5) * grid.cellW, (row + 0.5) * grid.cellH, blocks)
      keys[n] = key
      counts[key + 1]++
    }
    for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1]
    for (let n = 0; n < grid.count; n++) {
      const at = counts[keys[n]]++
      order[at] = grid.used[n]
      sorted[at] = keys[n]
    }
    let style = ''
    let alpha = -1
    for (let n = 0; n < grid.count; n++) {
      const cell = order[n]
      const col = cell % grid.cols
      const row = (cell - col) / grid.cols
      const next = styles[sorted[n]]
      if (next !== style) c.fillStyle = style = next
      const a = grid.alpha[cell] >> 4
      if (a !== alpha) {
        alpha = a
        c.globalAlpha = (a + 1) / 16
      }
      const code = grid.glyph[cell]
      let glyph = glyphs.get(code)
      if (!glyph) glyphs.set(code, (glyph = String.fromCharCode(code)))
      c.fillText(glyph, (col + 0.5) * grid.cellW, (row + 0.5) * grid.cellH)
    }
    c.globalAlpha = 1
  }

  return { readInks, resize, draw }
}
