export type Rect = { x: number; y: number; w: number; h: number }
export type Point = { x: number; y: number }

export const TAU = Math.PI * 2

export function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value
}

export function wrap(angle: number) {
  return angle - TAU * Math.floor((angle + Math.PI) / TAU)
}

export function smooth(t: number) {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export function ease(rate: number, dt: number) {
  return 1 - Math.exp(-rate * dt)
}

export const fromBox = { x: 0, y: 0 }

export function boxDistance(box: Rect, x: number, y: number, pad = 0) {
  fromBox.x = x - clamp(x, box.x - pad, box.x + box.w + pad)
  fromBox.y = y - clamp(y, box.y - pad, box.y + box.h + pad)
  return Math.hypot(fromBox.x, fromBox.y)
}

export function clear(box: Rect, p: Point, margin: number) {
  const d = boxDistance(box, p.x, p.y)
  if (d >= margin) return
  if (d) {
    p.x += (fromBox.x / d) * (margin - d)
    p.y += (fromBox.y / d) * (margin - d)
  } else p.y = box.y - margin
}

export function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
