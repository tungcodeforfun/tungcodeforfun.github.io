import { css, toggle, travel, type Track } from './motion'
import { Figure, type FigureProps } from './Figure'

const CYCLE = 12
const SOURCES = [0, 1, 2, 3, 4]
const RECORDS = [0, 1, 2, 3]
const COLUMNS = Array.from({ length: 13 }, (_, c) => c)
const ROWS = [0, 1, 2]
const NEW = [1, 6, 11]
const STAGES = [200, 330, 460]
const runs = [
  [0, 1.6],
  [2.2, 4.2],
  [4.8, 7.2],
] as const
const RESET = 11.2

const tracks: Track[] = [
  ...runs.map(([from, to], i) => travel(`p-r${i}`, CYCLE, from, to, 0.15)),
  travel('p-r3', CYCLE, 7.8, 10, 1.2),
  ...runs.map(([, to], i) => toggle(`p-n${i}`, CYCLE, to, RESET, 'opacity:0', 'opacity:1')),
]

export function MatchFigure({ meta }: FigureProps) {
  return (
    <Figure meta={meta} width={680} height={310} cycle={CYCLE} keyframes={css(CYCLE, tracks)}>
      {SOURCES.map((i) =>
        RECORDS.map((j) => <circle key={`${i}-${j}`} className="c-ink" cx={24 + i * 16} cy={66 + j * 16} r="4.5" />),
      )}
      <path className="ln" d="M104 90 H174 M226 90 H304 M356 90 H434 M486 90 H560 M200 116 V200 M330 116 V200 M460 116 V200" />
      <circle className="c-blue" cx={STAGES[0]} cy="90" r="26" />
      <circle className="c-green" cx={STAGES[1]} cy="90" r="26" />
      <circle className="c-purple" cx={STAGES[2]} cy="90" r="26" />
      <rect className="soft-red" x="560" y="68" width="100" height="44" rx="22" />
      <rect className="c-ink" x="150" y="200" width="360" height="100" rx="16" />
      {ROWS.map((r) =>
        COLUMNS.filter((c) => r > 0 || !NEW.includes(c)).map((c) => (
          <rect key={`${r}-${c}`} className="card" x={166 + c * 26} y={212 + r * 28} width="16" height="22" rx="3" />
        )),
      )}
      {NEW.map((c, i) => (
        <rect key={c} className={`card card--new motion p-n${i}`} x={166 + c * 26} y="212" width="16" height="22" rx="3" />
      ))}
      {STAGES.map((x, i) => (
        <circle key={x} className={`tok c-ink motion p-r${i}`} r="7" style={{ offsetPath: `path('M104 90 H${x} V222')` }} />
      ))}
      <circle className="tok c-ink motion p-r3" r="7" style={{ offsetPath: "path('M104 90 H600')" }} />
    </Figure>
  )
}
