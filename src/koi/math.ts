export type Rect = { x: number; y: number; w: number; h: number }

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

export function inside(rect: Rect | null, x: number, y: number) {
  return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
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
