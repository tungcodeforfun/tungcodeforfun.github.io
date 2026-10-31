import '../styles/site.css'
import { clamp, type Rect } from '../koi/math.ts'
import { cells, createPond } from '../koi/pond.ts'
import { createReading } from './reading.ts'
import { createSurface } from './surface.ts'
import { createWater, type Block } from './water.ts'

const root = document.documentElement
const main = document.querySelector('main')!
const name = document.querySelector<HTMLElement>('#name')!
const canvas = document.querySelector<HTMLCanvasElement>('.pond canvas')!
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const dark = matchMedia('(prefers-color-scheme: dark)')
const wide = matchMedia('(min-width: 768px)')
const coarse = matchMedia('(hover: none)')

function startClock() {
  const clock = document.querySelector<HTMLElement>('.clock')
  const time = clock?.querySelector<HTMLElement>('.time')
  if (!clock || !time) return
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: clock.dataset.zone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const tick = () => {
    time.textContent = format.format(new Date())
    setTimeout(tick, 1000 - (Date.now() % 1000) + 4)
  }
  tick()
}

function spyOnSections() {
  const links = new Map([...document.querySelectorAll<HTMLAnchorElement>('.side nav a')].map((a) => [a.hash.slice(1), a]))
  let current: HTMLAnchorElement | undefined
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        current?.removeAttribute('aria-current')
        current = links.get(entry.target.id)
        current?.setAttribute('aria-current', 'true')
      }
    },
    { rootMargin: '-40% 0px -59% 0px' },
  )
  for (const section of main.querySelectorAll('section')) observer.observe(section)
}

type Placed = Block & { fixed: boolean }

function measureBlocks(): Placed[] {
  const nodes = document.querySelectorAll<HTMLElement>('main h1, main h2, main p, main li, .side .clock, .side nav a, .colophon > *')
  return [...nodes].map((el) => {
    const r = el.getBoundingClientRect()
    const fixed = wide.matches && !!el.closest('.side, .colophon')
    return { x: r.left, y: fixed ? r.top : r.top + scrollY, w: r.width, h: r.height, fixed }
  })
}

function bootPond() {
  const water = createWater(canvas)
  if (!water) return
  const pond = createPond(Math.floor(Math.random() * 2 ** 31))
  const surface = createSurface(main)
  const column = () => {
    const r = name.getBoundingClientRect()
    return { left: r.left, right: r.left + main.querySelector('section')!.clientWidth }
  }
  const reading = createReading(column, main)
  let blocks: Placed[] = []
  const visible: Block[] = []
  let frame = 0
  let last = 0
  let width = canvas.clientWidth
  let height = canvas.clientHeight

  const origin = () => (reduced.matches ? 0 : scrollY)

  function layout() {
    surface.still()
    width = canvas.clientWidth
    height = canvas.clientHeight
    const length = Math.round(clamp(Math.min(width * 0.16, height * 0.3), 140, 240))
    const { fontSize, cellW, cellH } = cells(length)
    water!.resize(width, height, fontSize)
    pond.setLayout({ width, height, length, cellW, cellH })
    blocks = measureBlocks()
    surface.measure()
  }

  function openWater(): Rect | null {
    const top = name.getBoundingClientRect().top + scrollY - origin() - 16
    return top > height * 0.25 ? { x: 0, y: 0, w: width, h: top } : null
  }

  function steer(now: number) {
    const open = openWater()
    const whole = { x: 0, y: 0, w: width, h: height }
    if (!wide.matches) return pond.steer(open ?? whole, null)
    const { left, right } = column()
    const away = reading.engaged(now) || reading.idle(now)
    const text = { x: left - 28, y: Math.max(0, (open?.h ?? 0) - 8), w: right - left + 56, h: height * 2 }
    const margin = { x: 0, y: 0, w: left, h: height }
    pond.steer(open ?? (away ? margin : whole), away ? text : null)
  }

  function paint() {
    visible.length = 0
    const top = origin()
    for (const b of blocks) {
      const y = b.fixed ? b.y : b.y - top
      if (y + b.h < -40 || y > height + 40) continue
      visible.push({ x: b.x, y, w: b.w, h: b.h })
    }
    water!.draw(pond.paint(), visible)
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    steer(now)
    pond.step(dt)
    surface.part(pond.fish(), reading.strength(now), coarse.matches, now)
    paint()
    frame = requestAnimationFrame(tick)
  }

  function start() {
    if (frame || document.hidden || reduced.matches) return
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
    surface.still()
  }

  function settle() {
    layout()
    if (reduced.matches) {
      stop()
      paint()
    } else start()
  }

  water.readInks()
  steer(performance.now())
  layout()
  for (let i = 0; i < 90; i++) pond.step(1 / 60)
  paint()
  root.classList.add('live')
  start()

  let pending = 0
  addEventListener('resize', () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(settle)
  })
  document.fonts.ready.then(settle)
  reduced.addEventListener('change', settle)
  dark.addEventListener('change', () => {
    water.readInks()
    paint()
  })
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  addEventListener('pointerdown', (e) => {
    if (reduced.matches || (e.target as Element).closest('a, button, h1, h2, p, li, nav, .clock')) return
    pond.tap(e.clientX, e.clientY)
  })
}

startClock()
spyOnSections()
document.fonts.load("12px 'Koi Mono'").then(bootPond, bootPond)
