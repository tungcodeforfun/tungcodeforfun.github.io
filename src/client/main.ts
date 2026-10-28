import '../styles/site.css'
import { createPond, metrics } from '../koi/pond.ts'

const root = document.documentElement
const canvas = document.querySelector<HTMLCanvasElement>('.pond canvas')
const card = document.querySelector<HTMLElement>('.card')
const ctx = canvas?.getContext('2d')
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const dark = matchMedia('(prefers-color-scheme: dark)')
const pond = createPond(Math.floor(Math.random() * 2 ** 31))
const glyphs = new Map<number, string>()
let inks: string[] = []
let width = 0
let height = 0
let frame = 0
let last = 0
const pointer = { x: -1e4, y: -1e4 }

function readInks() {
  const style = getComputedStyle(root)
  inks = Array.from({ length: 10 }, (_, i) => style.getPropertyValue(`--k${i}`).trim())
}

function layout() {
  if (!canvas || !ctx || !card) return
  width = innerWidth
  height = innerHeight
  const dpr = Math.min(devicePixelRatio || 1, 3)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const box = card.getBoundingClientRect()
  const { length, fontSize, cellW, cellH } = metrics(width, height, box.top)
  const pad = cellH
  pond.setLayout({
    width,
    height,
    length,
    cellW,
    cellH,
    keepOut: { x: box.left - pad, y: box.top - pad, w: box.width + pad * 2, h: box.height + pad * 2 },
  })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.font = `${fontSize}px 'Koi Mono', ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
}

function draw() {
  if (!ctx) return
  const grid = pond.paint()
  ctx.clearRect(0, 0, width, height)
  for (let ink = 1; ink < inks.length; ink++) {
    ctx.fillStyle = inks[ink]
    let alpha = -1
    for (let n = 0; n < grid.count; n++) {
      const cell = grid.used[n]
      if (grid.ink[cell] !== ink) continue
      const a = grid.alpha[cell] >> 4
      if (a !== alpha) {
        alpha = a
        ctx.globalAlpha = (a + 1) / 16
      }
      const code = grid.glyph[cell]
      let glyph = glyphs.get(code)
      if (!glyph) glyphs.set(code, (glyph = String.fromCharCode(code)))
      const col = cell % grid.cols
      const row = (cell - col) / grid.cols
      ctx.fillText(glyph, (col + 0.5) * grid.cellW, (row + 0.5) * grid.cellH)
    }
  }
  ctx.globalAlpha = 1
}

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  pond.step(reduced.matches ? dt / 3 : dt)
  draw()
  frame = requestAnimationFrame(tick)
}

function start() {
  if (frame || document.hidden) return
  last = performance.now()
  frame = requestAnimationFrame(tick)
}

function stop() {
  cancelAnimationFrame(frame)
  frame = 0
}

async function boot() {
  if (!canvas || !ctx || !card) return
  await document.fonts.load("15px 'Koi Mono'").catch(() => [])
  readInks()
  layout()
  for (let i = 0; i < 60; i++) pond.step(1 / 60)
  draw()
  root.classList.add('live')
  start()
  addEventListener('resize', layout)
  document.fonts.ready.then(layout)
  dark.addEventListener('change', readInks)
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  addEventListener('pointerdown', (e) => {
    if (!card.contains(e.target as Node)) pond.tap(e.clientX, e.clientY)
  })
  addEventListener('pointermove', (e) => {
    if (reduced.matches || e.pointerType !== 'mouse') return
    if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) < 28) return
    pointer.x = e.clientX
    pointer.y = e.clientY
    pond.stir(e.clientX, e.clientY)
  })
}

boot()
