import { toggle, travel, type Track } from './motion'
import { Figure, Token, type FigureProps } from './Figure'

const CYCLE = 13
const EVENTS = 'M72 122 H372'
const BACKFILL = 'M46 148 V230 H300 V152'
const ITEMS = 1300
const KEPT = 130
const BATCH = (ITEMS - KEPT) / 3
const FLAGS = Array.from({ length: 8 }, (_, i) => i)
const RESET = 12.3

function shuffled(n: number) {
  const order = Array.from({ length: n }, (_, i) => i)
  let seed = 7
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const j = seed % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

function dots(indices: number[]) {
  return indices.map((i) => `M${384 + (i % 36) * 7} ${24 + Math.floor(i / 36) * 7}h0`).join('')
}

const order = shuffled(ITEMS)
const kept = dots(order.slice(0, KEPT))
const batches = [0, 1, 2].map((b) => dots(order.slice(KEPT + b * BATCH, KEPT + (b + 1) * BATCH)))
const arrivals = [1.8, 4.8, 7.8]

const tracks: Track[] = [
  ...arrivals.map((to, i) => travel(`m-e${i}`, CYCLE, to - 1.8, to)),
  travel('m-bf', CYCLE, 8.6, 11),
  ...arrivals.map((at, i) => toggle(`m-b${i}`, CYCLE, at, RESET, 'opacity:1', 'opacity:.12')),
  ...FLAGS.map((i) => toggle(`m-f${i}`, CYCLE, 9.44 + i * 0.14, RESET, 'fill:transparent', 'fill:var(--k-amber)')),
]

export function MenuFigure({ meta }: FigureProps) {
  return (
    <Figure meta={meta} width={680} height={300} cycle={CYCLE} tracks={tracks}>
      <path className="ln" d="M72 122 H110 M240 122 H270 M330 122 H372 M46 148 V230 H104 M276 230 H300 V152" />
      <rect className="c-purple" x="20" y="96" width="52" height="52" rx="12" />
      <path className="glyph-fill" d="M34 110h10v10h-10z M50 110h10v10h-10z M34 126h10v10h-10z M50 126h10v10h-10z" />
      <rect className="soft-orange" x="110" y="100" width="130" height="44" rx="22" />
      <circle className="c-green" cx="300" cy="122" r="30" />
      <path className="glyph spin" d="M300 104 a18 18 0 0 1 18 18" />
      <path className="items" d={kept} />
      {batches.map((d, i) => (
        <path key={i} className={`items items--gone motion m-b${i}`} d={d} />
      ))}
      <path className="ln" d={FLAGS.map((i) => `M${116 + i * 21} 230 V204`).join(' ')} />
      {FLAGS.map((i) => (
        <path key={i} className={`flag motion m-f${i}`} d={`M${116 + i * 21} 204 l14 5 l-14 5 z`} />
      ))}
      {arrivals.map((_, i) => (
        <Token key={i} path={EVENTS} track={`m-e${i}`} color="c-purple" />
      ))}
      <Token path={BACKFILL} track="m-bf" color="c-amber" />
    </Figure>
  )
}
