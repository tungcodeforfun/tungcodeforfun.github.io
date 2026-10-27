import type { CSSProperties } from 'react'
import { css, travel, type Track } from './motion'
import { Figure, type FigureProps } from './Figure'

const CYCLE = 9
const MAIN = 'M76 150 H436'
const RETRY = 'M76 150 H360 C360 66 210 66 210 150 H436'
const DEAD = 'M76 150 H360 C360 66 210 66 210 150 V252'
const COLUMNS = Array.from({ length: 12 }, (_, c) => c)
const ROWS = Array.from({ length: 10 }, (_, r) => r)

const blue = 'fill:var(--k-blue)'
const red = 'fill:var(--k-red)'
const tracks: Track[] = [
  travel('q-a', CYCLE, 0, 2),
  travel('q-b', CYCLE, 2.7, 5.6),
  {
    name: 'q-c',
    stops: [
      [0, `offset-distance:0%;opacity:0;${blue}`],
      [6, `offset-distance:0%;opacity:0;${blue}`],
      [6.12, `opacity:1;${blue}`],
      [7.8, `offset-distance:100%;opacity:1;${blue}`],
      [7.95, `offset-distance:100%;opacity:1;${red}`],
      [8.6, `offset-distance:100%;opacity:1;${red}`],
      [8.8, `offset-distance:100%;opacity:0;${red}`],
      [CYCLE, `offset-distance:100%;opacity:0;${red}`],
    ],
  },
  {
    name: 'q-wave',
    stops: [
      [0, 'fill:var(--dot)'],
      [2, 'fill:var(--dot)'],
      [2.25, blue],
      [2.7, blue],
      [3.4, 'fill:var(--dot)'],
      [5.6, 'fill:var(--dot)'],
      [5.85, blue],
      [6.3, blue],
      [7, 'fill:var(--dot)'],
      [CYCLE, 'fill:var(--dot)'],
    ],
  },
  {
    name: 'q-ring',
    stops: [
      [0, 'opacity:0;transform:scale(1)'],
      [7.9, 'opacity:0;transform:scale(1)'],
      [7.95, 'opacity:.9;transform:scale(1)'],
      [8.8, 'opacity:0;transform:scale(3)'],
      [CYCLE, 'opacity:0;transform:scale(3)'],
    ],
  },
]

export function QueueFigure({ meta }: FigureProps) {
  return (
    <Figure meta={meta} width={680} height={300} cycle={CYCLE} keyframes={css(CYCLE, tracks)}>
      <path className="ln" d="M360 120 C360 66 210 66 210 128 M204 120 l6 9 l6 -9 M210 172 V232 M76 150 H120 M300 150 H330 M390 150 H430" />
      <rect className="c-blue" x="24" y="124" width="52" height="52" rx="12" />
      <path className="glyph" d="M38 140 h24 M38 150 h24 M38 160 h16" />
      <rect className="soft-orange" x="120" y="128" width="180" height="44" rx="22" />
      <circle className="c-green" cx="360" cy="150" r="30" />
      <path className="glyph spin" d="M360 132 a18 18 0 0 1 18 18" />
      <rect className="soft-red" x="160" y="232" width="100" height="40" rx="20" />
      <circle className="c-red" cx="290" cy="252" r="7" />
      <circle className="ring motion q-ring" cx="290" cy="252" r="7" />
      {COLUMNS.map((c) => (
        <g key={c} className="field motion q-wave" style={{ '--d': `${c * 0.05}s` } as CSSProperties}>
          {ROWS.map((r) => (
            <circle key={r} cx={452 + c * 18} cy={66 + r * 18} r="5" />
          ))}
        </g>
      ))}
      <circle className="tok c-blue motion q-a" r="8" style={{ offsetPath: `path('${MAIN}')` }} />
      <circle className="tok c-blue motion q-b" r="8" style={{ offsetPath: `path('${RETRY}')` }} />
      <circle className="tok c-blue motion q-c" r="8" style={{ offsetPath: `path('${DEAD}')` }} />
    </Figure>
  )
}
