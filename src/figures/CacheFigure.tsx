import { toggle, travel, type Track } from './motion'
import { Figure, Token, type FigureProps } from './Figure'

const CYCLE = 11.5
const HIT = 'M20 110 H490 H20'
const MISS = 'M20 110 H490 H250 V206 V110 H490 H20'
const hits = [
  [0, 1.8],
  [2.2, 4],
  [8.8, 10.6],
] as const
const SLOTS = [0, 1, 2, 3]

const tracks: Track[] = [
  ...hits.map(([from, to], i) => travel(`c-h${i}`, CYCLE, from, to, 0.15)),
  travel('c-miss', CYCLE, 4.6, 8.2, 0.15),
  toggle('c-lock', CYCLE, 6.9, 7.5, 'opacity:0', 'opacity:1'),
  toggle('c-slot', CYCLE, 7.2, 11, 'opacity:0', 'opacity:1'),
]

export function CacheFigure({ meta }: FigureProps) {
  return (
    <Figure meta={meta} width={680} height={270} cycle={CYCLE} tracks={tracks}>
      <rect className="region" x="180" y="40" width="140" height="140" rx="28" />
      <rect className="region" x="440" y="40" width="200" height="140" rx="28" />
      <path className="ln" d="M20 110 H220 M280 110 H490 M250 140 V197" />
      <circle className="c-green" cx="250" cy="110" r="30" />
      <rect className="c-teal" x="490" y="86" width="100" height="48" rx="14" />
      {SLOTS.map((i) => (
        <circle key={i} className="glyph-fill" cx={510 + i * 15} cy="110" r="4" />
      ))}
      <circle className="glyph-fill motion c-slot" cx="570" cy="110" r="4" />
      <rect className="lock motion c-lock" x="481" y="77" width="118" height="66" rx="20" />
      <path className="c-slate" d="M218 206 v34 a32 9 0 0 0 64 0 v-34 a32 9 0 0 0 -64 0z" />
      <ellipse className="glyph" cx="250" cy="206" rx="32" ry="9" />
      {hits.map((_, i) => (
        <Token key={i} path={HIT} track={`c-h${i}`} color="c-ink" />
      ))}
      <Token path={MISS} track="c-miss" color="c-ink" />
    </Figure>
  )
}
