import { emitEnvChange, env, remember } from './env'
import { spring, stepSpring, settled } from './spring'

const root = document.documentElement

export function setupTheme(button: HTMLButtonElement) {
  const sync = () => {
    const next = env.dark ? 'light' : 'dark'
    button.textContent = next === 'dark' ? 'Dark' : 'Light'
    button.setAttribute('aria-label', `Switch to ${next} theme`)
  }
  const apply = () => {
    const next = env.dark ? 'light' : 'dark'
    root.dataset.theme = next
    remember('theme', next)
    sync()
    emitEnvChange()
  }
  button.addEventListener('click', () => {
    const box = button.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    root.style.setProperty('--vt-x', `${x}px`)
    root.style.setProperty('--vt-y', `${y}px`)
    root.style.setProperty('--vt-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`)
    if (document.startViewTransition) document.startViewTransition(apply)
    else apply()
  })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync)
  sync()
  button.hidden = false
}

export function setupMotion(button: HTMLButtonElement) {
  const sync = () => {
    button.textContent = env.paused ? 'Play motion' : 'Pause motion'
  }
  button.addEventListener('click', () => {
    const paused = !env.paused
    if (paused) root.dataset.motion = 'paused'
    else delete root.dataset.motion
    remember('motion', paused ? 'paused' : 'running')
    sync()
    emitEnvChange()
  })
  sync()
  button.hidden = false
}

export function setupTopbar(topbar: HTMLElement, hero: HTMLElement) {
  const sync = () => topbar.toggleAttribute('data-solid', hero.getBoundingClientRect().bottom < 80)
  addEventListener('scroll', sync, { passive: true })
  sync()
}

export function setupHeroProgress(hero: HTMLElement, onProgress: (p: number) => void) {
  const sync = () => {
    const box = hero.getBoundingClientRect()
    const room = Math.max(1, box.height - innerHeight)
    const p = Math.min(1, Math.max(0, -box.top / room))
    hero.style.setProperty('--p', p.toFixed(4))
    onProgress(p)
  }
  addEventListener('scroll', sync, { passive: true })
  addEventListener('resize', sync)
  sync()
}

export function setupTilt(el: HTMLElement) {
  if (!matchMedia('(pointer: fine)').matches) return
  const rx = spring(0)
  const ry = spring(0)
  let frame = 0
  let last = 0
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60)
    last = now
    stepSpring(rx, dt, 120, 20)
    stepSpring(ry, dt, 120, 20)
    el.style.setProperty('--rx', `${rx.value.toFixed(3)}deg`)
    el.style.setProperty('--ry', `${ry.value.toFixed(3)}deg`)
    frame = settled(rx) && settled(ry) ? 0 : requestAnimationFrame(tick)
  }
  const kick = () => {
    if (!frame) {
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
  }
  el.addEventListener('pointermove', (e) => {
    if (env.reduced || env.paused) return
    const box = el.getBoundingClientRect()
    ry.target = ((e.clientX - box.left) / box.width - 0.5) * 7
    rx.target = -((e.clientY - box.top) / box.height - 0.5) * 5
    kick()
  })
  el.addEventListener('pointerleave', () => {
    rx.target = 0
    ry.target = 0
    kick()
  })
}
