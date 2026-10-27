export type Palette = {
  bg: string
  stage: string
  fg: string
  strong: string
  muted: string
  dot: string
  line: string
  blue: string
  orange: string
  green: string
  red: string
  purple: string
  amber: string
  teal: string
  slate: string
  ink: string
  dark: boolean
}

const VARS: Record<Exclude<keyof Palette, 'dark'>, string> = {
  bg: '--bg',
  stage: '--stage',
  fg: '--fg',
  strong: '--strong',
  muted: '--muted',
  dot: '--dot',
  line: '--line',
  blue: '--k-blue',
  orange: '--k-orange',
  green: '--k-green',
  red: '--k-red',
  purple: '--k-purple',
  amber: '--k-amber',
  teal: '--k-teal',
  slate: '--k-slate',
  ink: '--k-ink',
}

export function readPalette(el: HTMLElement): Palette {
  const probe = document.createElement('span')
  probe.hidden = true
  el.append(probe)
  const out = {} as Palette
  for (const [key, name] of Object.entries(VARS)) {
    probe.style.color = `var(${name})`
    out[key as keyof typeof VARS] = getComputedStyle(probe).color
  }
  probe.remove()
  out.dark = luminance(out.bg) < 0.3
  return out
}

export function rgb(color: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)
  return [r, g, b]
}

function luminance(color: string) {
  const [r, g, b] = rgb(color)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
