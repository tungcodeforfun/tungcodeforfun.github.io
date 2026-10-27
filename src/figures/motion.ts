type Stop = readonly [seconds: number, declarations: string]

export type Track = { name: string; stops: Stop[] }

export function keyframes(cycle: number, tracks: Track[]): string {
  const at = (s: number) => `${+((Math.min(Math.max(s, 0), cycle) / cycle) * 100).toFixed(3)}%`
  return tracks
    .map(({ name, stops }) => {
      const frames = stops.map(([s, d]) => `${at(s)}{${d}}`).join('')
      return `@keyframes ${name}{${frames}}.${name}{animation-name:${name}}`
    })
    .join('')
}

export function travel(name: string, cycle: number, from: number, to: number, hold = 0.25): Track {
  const start = 'offset-distance:0%;opacity:0'
  const end = 'offset-distance:100%;opacity:0'
  return {
    name,
    stops: [
      [0, start],
      [from, start],
      [from + 0.12, 'opacity:1'],
      [to, 'offset-distance:100%;opacity:1'],
      [to + hold, end],
      [cycle, end],
    ],
  }
}

export function toggle(name: string, cycle: number, on: number, off: number, offState: string, onState: string): Track {
  return {
    name,
    stops: [
      [0, offState],
      [on, offState],
      [on + 0.3, onState],
      [off, onState],
      [off + 0.4, offState],
      [cycle, offState],
    ],
  }
}
