import { rgb, type Palette } from '../palette'

export const FONT = '"Mona Sans", ui-sans-serif, system-ui, sans-serif'

const colorCache = new Map<string, string>()

export function alpha(color: string, a: number) {
  const key = `${color}|${a.toFixed(2)}`
  let out = colorCache.get(key)
  if (!out) {
    const [r, g, b] = rgb(color)
    out = `rgba(${r},${g},${b},${a.toFixed(2)})`
    colorCache.set(key, out)
  }
  return out
}

export function mix(a: string, b: string, t: number) {
  const key = `${a}|${b}|${t.toFixed(2)}`
  let out = colorCache.get(key)
  if (!out) {
    const x = rgb(a)
    const y = rgb(b)
    const c = x.map((v, i) => Math.round(v + (y[i] - v) * t))
    out = `rgb(${c[0]},${c[1]},${c[2]})`
    colorCache.set(key, out)
  }
  return out
}

const glowCache = new Map<string, HTMLCanvasElement>()

export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, strength = 1) {
  const key = color
  let sprite = glowCache.get(key)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    const s = sprite.getContext('2d')!
    const grad = s.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    s.fillStyle = grad
    s.globalAlpha = 0.55
    s.fillRect(0, 0, 64, 64)
    glowCache.set(key, sprite)
  }
  g.save()
  g.globalAlpha *= strength
  g.drawImage(sprite, x - r, y - r, r * 2, r * 2)
  g.restore()
}

export function ball(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, dark: boolean) {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  grad.addColorStop(0, mix(color, '#ffffff', dark ? 0.45 : 0.35))
  grad.addColorStop(0.55, color)
  grad.addColorStop(1, mix(color, '#000000', dark ? 0.35 : 0.22))
  g.fillStyle = grad
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

export function pill(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = h / 2) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

export function label(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 12,
  weight = 520,
  align: CanvasTextAlign = 'left',
) {
  g.font = `${weight} ${size}px ${FONT}`
  g.fillStyle = color
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillText(text, x, y)
}

export function tabular(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 12,
  weight = 560,
  align: 'left' | 'right' = 'left',
) {
  g.font = `${weight} ${size}px ${FONT}`
  g.fillStyle = color
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  const digit = g.measureText('0').width
  const widths = [...text].map((c) => (c >= '0' && c <= '9' ? digit : g.measureText(c).width))
  let cx = align === 'right' ? x - widths.reduce((a, b) => a + b, 0) : x
  ;[...text].forEach((c, i) => {
    const cw = widths[i]
    g.fillText(c, cx + (c >= '0' && c <= '9' ? (digit - g.measureText(c).width) / 2 : 0), y)
    cx += cw
  })
}

export function drawCursor(g: CanvasRenderingContext2D, x: number, y: number, text: string | null, p: Palette) {
  g.save()
  g.strokeStyle = p.strong
  g.lineWidth = 1.25
  g.beginPath()
  g.arc(x, y, 13, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = p.strong
  g.beginPath()
  g.arc(x, y, 2, 0, Math.PI * 2)
  g.fill()
  if (text) {
    g.font = `540 12px ${FONT}`
    const tw = g.measureText(text).width
    const bw = tw + 20
    const bx = Math.min(x + 20, g.canvas.width / (g.getTransform().a || 1) - bw - 8)
    const by = y - 34 < 6 ? y + 20 : y - 34
    g.fillStyle = p.strong
    pill(g, bx, by, bw, 24)
    g.fill()
    label(g, text, bx + 10, by + 12.5, p.bg, 12, 540)
  }
  g.restore()
}
