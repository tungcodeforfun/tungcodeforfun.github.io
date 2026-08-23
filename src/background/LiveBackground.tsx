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

// Small screens keep most of the text scrim even in the hero.
const SMALL_SCREEN_SCRIM = 0.75

type Fade = { dim: number; scrim: number }

function computeFade(): Fade {
  const viewport = Math.max(window.innerHeight, 1)
  const ramp = viewport * 0.9
  const small = window.innerWidth < SMALL_SCREEN
  const fromTop = clamp01(window.scrollY / ramp)
  const remaining = document.documentElement.scrollHeight - viewport - window.scrollY
  const fromBottom = clamp01(remaining / ramp)
  const scrollDim = MAX_SCROLL_DIM * Math.min(fromTop, Math.max(fromBottom, END_FLOOR))
  return {
    dim: Math.max(scrollDim, small ? SMALL_SCREEN_DIM : 0),
    scrim: Math.max(fromTop, small ? SMALL_SCREEN_SCRIM : 0),
  }
}

/**
 * Fixed full-viewport shader behind the page plus the text-protect scrim.
 * Both are off in the hero and fade in as the text sections scroll into view.
 */
export function LiveBackground() {
  const [fade, setFade] = useState<Fade>(() => computeFade())

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setFade(computeFade())
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
    <>
      <BackgroundBoundary>
        <RibbonField dim={fade.dim} />
      </BackgroundBoundary>
      <div className="scrim" aria-hidden="true" style={{ opacity: fade.scrim }} />
    </>
  )
}
