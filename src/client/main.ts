import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/layout.css'
import '../styles/sim.css'
import { env, recall, remember, whenVisible } from './env'
import { setupHeroProgress, setupMotion, setupTheme, setupTilt, setupTopbar } from './chrome'
import type { SimId } from '../content'

const loaders: Record<SimId, () => Promise<{ mount: (figure: HTMLElement) => void }>> = {
  queue: () => import('./sim/queue'),
  menu: () => import('./sim/menu'),
  cache: () => import('./sim/cache'),
  match: () => import('./sim/match'),
}

const themeButton = document.querySelector<HTMLButtonElement>('[data-toggle="theme"]')
const motionButton = document.querySelector<HTMLButtonElement>('[data-toggle="motion"]')
const hero = document.querySelector<HTMLElement>('.hero')
const topbar = document.querySelector<HTMLElement>('.topbar')
const tilt = document.querySelector<HTMLElement>('[data-tilt]')

if (themeButton) setupTheme(themeButton)
if (motionButton) setupMotion(motionButton)
if (tilt) setupTilt(tilt)

let heroProgress = 0
let onHeroProgress: ((p: number) => void) | undefined
if (hero) {
  if (topbar) setupTopbar(topbar, hero)
  setupHeroProgress(hero, (p) => {
    heroProgress = p
    onHeroProgress?.(p)
  })
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

function webglAvailable() {
  if (recall('webgl') === 'fail') return false
  const gl = document.createElement('canvas').getContext('webgl2')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  const renderer = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  const ok = !!gl && (env.softwareGl || !SOFTWARE_RENDERER.test(renderer))
  if (!ok) remember('webgl', 'fail')
  return ok
}

function startHero(el: HTMLElement) {
  if (!webglAvailable()) return
  import('./hero/scene')
    .then(({ createHero }) => {
      const handle = createHero(el, heroProgress)
      onHeroProgress = handle.progress
    })
    .catch(() => delete el.dataset.live)
}

function afterFirstPaint(run: () => void) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 2500 }) : setTimeout(run, 400))
  if (document.readyState === 'complete') go()
  else addEventListener('load', go, { once: true })
}

if (hero) afterFirstPaint(() => startHero(hero))

for (const figure of document.querySelectorAll<HTMLElement>('.sim[data-sim]')) {
  const id = figure.dataset.sim as SimId
  const stop = whenVisible(
    figure,
    (visible) => {
      if (!visible) return
      stop()
      loaders[id]().then(({ mount }) => mount(figure))
    },
    '600px 0px',
  )
}

const cueObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      cueObserver.unobserve(entry.target)
      const el = entry.target as HTMLElement
      const figure = el.closest('.case')?.querySelector<HTMLElement>('.sim')
      if (!figure) continue
      if (figure.hasAttribute('data-live')) figure.dispatchEvent(new CustomEvent('cue', { detail: el.dataset.cue }))
      else figure.dataset.pendingCue = el.dataset.cue
    }
  },
  { rootMargin: '0px 0px -45% 0px' },
)
for (const el of document.querySelectorAll('[data-cue]')) cueObserver.observe(el)
