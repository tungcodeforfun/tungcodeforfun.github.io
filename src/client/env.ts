const root = document.documentElement
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)')
const darkQuery = matchMedia('(prefers-color-scheme: dark)')
const EVENT = 'envchange'

export const env = {
  get paused() {
    return root.dataset.motion === 'paused'
  },
  get reduced() {
    return reducedQuery.matches
  },
  get dark() {
    const theme = root.dataset.theme
    return theme ? theme === 'dark' : darkQuery.matches
  },
  get still() {
    return new URLSearchParams(location.search).has('still')
  },
}

export function onEnvChange(listener: () => void) {
  root.addEventListener(EVENT, listener)
}

export function emitEnvChange() {
  root.dispatchEvent(new Event(EVENT))
}

reducedQuery.addEventListener('change', emitEnvChange)
darkQuery.addEventListener('change', emitEnvChange)

export function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function recall(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function whenVisible(el: Element, onChange: (visible: boolean) => void, rootMargin = '0px') {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) onChange(entry.isIntersecting)
  }, { rootMargin })
  observer.observe(el)
  return () => observer.disconnect()
}
