import { env, onEnvChange, whenVisible } from '../env'
import { readPalette, type Palette } from '../palette'
import { seeded } from '../random'
import { drawCursor } from './draw'

export type SimApi = {
  say(text: string): void
  random(): number
  readonly ambient: boolean
}

export type Sim = {
  step(dt: number): void
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: Palette): void
  action(name: string, value: number): void
  inspect?(x: number, y: number): string | null
}

const STILL_SECONDS = 9

function wireControls(figure: HTMLElement, sim: Sim) {
  for (const button of figure.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
    button.addEventListener('click', () => {
      const action = button.dataset.action!
      if (button.hasAttribute('aria-pressed')) {
        const pressed = button.getAttribute('aria-pressed') !== 'true'
        button.setAttribute('aria-pressed', String(pressed))
        sim.action(action, pressed ? 1 : 0)
      } else sim.action(action, 1)
    })
  }
  for (const input of figure.querySelectorAll<HTMLInputElement>('input[type="radio"][data-action]')) {
    input.addEventListener('change', () => input.checked && sim.action(input.dataset.action!, Number(input.value)))
  }
  for (const input of figure.querySelectorAll<HTMLInputElement>('input[type="range"][data-action]')) {
    const sync = () => {
      const pct = (100 * (Number(input.value) - Number(input.min))) / (Number(input.max) - Number(input.min))
      input.style.setProperty('--fill', `${pct}%`)
      input.setAttribute('aria-valuetext', input.getAttribute('aria-valuetext')!.replace(/^\d+%/, `${Math.round(pct)}%`))
    }
    input.addEventListener('input', () => {
      sync()
      sim.action(input.dataset.action!, Number(input.value))
    })
    sync()
  }
}

export function setControl(figure: HTMLElement, action: string, value: number) {
  const input = figure.querySelector<HTMLInputElement>(`input[type="range"][data-action="${action}"]`)
  if (!input) return
  input.value = String(value)
  input.dispatchEvent(new Event('input'))
}

export function mountSim(figure: HTMLElement, create: (api: SimApi) => Sim) {
  const stage = figure.querySelector<HTMLElement>('.sim__stage')!
  const still = figure.querySelector<HTMLElement>('.sim__still')!
  const readout = figure.querySelector<HTMLElement>('.sim__readout')!
  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-labelledby', still.getAttribute('aria-labelledby')!)
  canvas.setAttribute('aria-describedby', still.getAttribute('aria-describedby')!)
  still.removeAttribute('role')
  still.removeAttribute('aria-labelledby')
  still.removeAttribute('aria-describedby')
  stage.append(canvas)
  const g = canvas.getContext('2d')!

  const api: SimApi = {
    say: (text) => {
      readout.textContent = text
    },
    random: seeded(20251027),
    get ambient() {
      return !env.paused
    },
  }
  const sim = create(api)
  let palette = readPalette(figure)
  let w = 0
  let h = 0
  let dpr = 1
  let pointer: { x: number; y: number; until: number } | null = null

  const render = () => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    sim.draw(g, w, h, palette)
    if (pointer && performance.now() < pointer.until) drawCursor(g, pointer.x, pointer.y, sim.inspect?.(pointer.x, pointer.y) ?? null, palette)
  }

  const resize = () => {
    const box = stage.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = box.width
    h = box.height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    render()
  }
  new ResizeObserver(resize).observe(stage)
  resize()

  const locate = (e: PointerEvent, hold: number) => {
    const box = canvas.getBoundingClientRect()
    pointer = { x: e.clientX - box.left, y: e.clientY - box.top, until: performance.now() + hold }
  }
  canvas.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && locate(e, Infinity))
  canvas.addEventListener('pointerdown', (e) => e.pointerType !== 'mouse' && locate(e, 2600))
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') pointer = null
  })

  let visible = false
  let raf = 0
  let last = 0
  const frame = (now: number) => {
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 20))
    last = now
    sim.step(dt * (env.reduced ? 0.5 : 1))
    render()
    raf = requestAnimationFrame(frame)
  }
  const run = () => {
    const should = visible && !document.hidden
    if (should && !raf) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    } else if (!should && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  wireControls(figure, sim)
  figure.addEventListener('cue', (e) => sim.action((e as CustomEvent<string>).detail, 1))
  onEnvChange(() => {
    palette = readPalette(figure)
    render()
  })

  if (env.still) {
    for (let t = 0; t < STILL_SECONDS; t += 1 / 60) sim.step(1 / 60)
    render()
    figure.dataset.stillReady = ''
    return
  }

  const pending = figure.dataset.pendingCue
  if (pending) {
    delete figure.dataset.pendingCue
    sim.action(pending, 1)
  }
  figure.dataset.live = ''
  whenVisible(figure, (v) => {
    visible = v
    run()
  })
  document.addEventListener('visibilitychange', run)
}
