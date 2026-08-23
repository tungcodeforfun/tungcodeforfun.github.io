import { useEffect, useState } from 'react'
import { BackgroundBoundary } from './BackgroundBoundary'
import { RibbonField } from './RibbonField'

const MAX_SCROLL_DIM = 0.88
// The ribbons return partway at the end of the page so the contact section echoes the hero.
const END_FLOOR = 0.5
const SMALL_SCREEN = 720
// Narrow screens put the hero copy on top of the ribbons, so hold them back a little.
const SMALL_SCREEN_DIM = 0.6

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function computeDim() {
  const viewport = Math.max(window.innerHeight, 1)
  const ramp = viewport * 0.9
  const fromTop = clamp01(window.scrollY / ramp)
  const remaining = document.documentElement.scrollHeight - viewport - window.scrollY
  const fromBottom = clamp01(remaining / ramp)
  const scrollDim = MAX_SCROLL_DIM * Math.min(fromTop, Math.max(fromBottom, END_FLOOR))
  const baseDim = window.innerWidth < SMALL_SCREEN ? SMALL_SCREEN_DIM : 0
  return Math.max(scrollDim, baseDim)
}

/** Fixed full-viewport shader behind the page; fades as the hero scrolls away. */
export function LiveBackground() {
  const [dim, setDim] = useState(() => computeDim())

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setDim(computeDim())
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <BackgroundBoundary>
      <RibbonField dim={dim} />
    </BackgroundBoundary>
  )
}
