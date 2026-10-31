import { smooth } from '../koi/math.ts'

export type Reading = {
  engaged(now: number): boolean
  idle(now: number): boolean
  strength(now: number): number
}

const SCROLL_HOLD = 1000
const IDLE_AFTER = 12000
const CALM_AFTER = 3000
const RISE = 900
const FALL = 600

export function createReading(column: () => { left: number; right: number }, main: HTMLElement): Reading {
  const pointer = { x: 0, y: 0, here: false }
  let lastScroll = -Infinity
  let lastInput = performance.now()
  let selecting = false
  let held = false
  let focused = false
  let calmSince = -1
  let level = 0
  let lastCall = performance.now()

  const scrolled = () => {
    lastScroll = lastInput = performance.now()
  }
  addEventListener('scroll', scrolled, { passive: true })
  addEventListener('wheel', scrolled, { passive: true })
  addEventListener('keydown', scrolled)
  addEventListener(
    'touchstart',
    () => {
      held = true
      scrolled()
    },
    { passive: true },
  )
  addEventListener('touchmove', scrolled, { passive: true })
  const lifted = (e: TouchEvent) => {
    held = e.touches.length > 0
    scrolled()
  }
  addEventListener('touchend', lifted, { passive: true })
  addEventListener('touchcancel', lifted, { passive: true })
  addEventListener('pointermove', (e) => {
    lastInput = performance.now()
    if (e.pointerType === 'touch') return
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.here = true
  })
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) pointer.here = false
  })
  document.addEventListener('selectionchange', () => {
    selecting = !(getSelection()?.isCollapsed ?? true)
  })
  document.addEventListener('focusin', (e) => {
    focused = main.contains(e.target as Node) && (e.target as Element).matches(':focus-visible')
  })
  document.addEventListener('focusout', () => {
    focused = false
  })

  function engaged(now: number) {
    if (held || selecting || focused || now - lastScroll < SCROLL_HOLD) return true
    if (!pointer.here) return false
    const { left, right } = column()
    return pointer.x > left - 24 && pointer.x < right + 24
  }

  function idle(now: number) {
    return now - lastInput > IDLE_AFTER
  }

  function strength(now: number) {
    const dt = now - lastCall
    lastCall = now
    if (engaged(now) || now - lastInput < CALM_AFTER) {
      calmSince = -1
      level = 0
      return 0
    }
    if (calmSince < 0 || idle(now)) calmSince = now
    level = idle(now) ? Math.max(0, level - dt / FALL) : Math.max(level, smooth((now - calmSince) / RISE))
    return level
  }

  return { engaged, idle, strength }
}
