import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/layout.css'
import '../styles/figures.css'

const root = document.documentElement

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

function setupTheme(button: HTMLButtonElement) {
  const system = matchMedia('(prefers-color-scheme: dark)')
  const current = () => root.dataset.theme ?? (system.matches ? 'dark' : 'light')
  const sync = () => {
    const next = current() === 'dark' ? 'light' : 'dark'
    button.textContent = next === 'dark' ? 'Dark' : 'Light'
    button.setAttribute('aria-label', `Switch to ${next} theme`)
  }
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    remember('theme', next)
    sync()
  })
  system.addEventListener('change', sync)
  sync()
  button.hidden = false
}

function setupMotion(button: HTMLButtonElement) {
  const sync = () => {
    const paused = root.dataset.motion === 'paused'
    button.textContent = paused ? 'Play motion' : 'Pause motion'
    button.setAttribute('aria-pressed', String(paused))
  }
  button.addEventListener('click', () => {
    const paused = root.dataset.motion !== 'paused'
    if (paused) root.dataset.motion = 'paused'
    else delete root.dataset.motion
    remember('motion', paused ? 'paused' : 'running')
    sync()
  })
  sync()
  button.hidden = false
}

function pauseOffscreen() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-offscreen', !entry.isIntersecting)
  })
  for (const el of document.querySelectorAll('.motion-scope')) observer.observe(el)
  const syncVisibility = () => root.toggleAttribute('data-hidden', document.hidden)
  document.addEventListener('visibilitychange', syncVisibility)
  syncVisibility()
}

function setupFigurePauses() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pause]')) {
    const figure = button.closest('figure')
    if (!figure) continue
    button.addEventListener('click', () => {
      const paused = figure.classList.toggle('is-paused')
      button.setAttribute('aria-pressed', String(paused))
    })
    button.hidden = false
  }
}

const themeButton = document.querySelector<HTMLButtonElement>('[data-toggle="theme"]')
const motionButton = document.querySelector<HTMLButtonElement>('[data-toggle="motion"]')
if (themeButton) setupTheme(themeButton)
if (motionButton) setupMotion(motionButton)
pauseOffscreen()
setupFigurePauses()
