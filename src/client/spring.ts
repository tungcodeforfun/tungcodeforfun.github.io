export type Spring = { value: number; target: number; velocity: number }

export function spring(value: number): Spring {
  return { value, target: value, velocity: 0 }
}

export function stepSpring(s: Spring, dt: number, stiffness = 170, damping = 26) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    const force = stiffness * (s.target - s.value) - damping * s.velocity
    s.velocity += force * h
    s.value += s.velocity * h
  }
  return s.value
}

export function settled(s: Spring, epsilon = 1e-3) {
  return Math.abs(s.target - s.value) < epsilon && Math.abs(s.velocity) < epsilon
}
