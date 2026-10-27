import { field } from '../content'

const COLS = 70
const ROWS = 50
const PITCH = 6
const ROW_STEP = 0.24
const CYCLE = ROWS * ROW_STEP
const RETRIED: [number, number][] = [
  [9, 4],
  [52, 11],
  [23, 19],
  [61, 27],
  [5, 33],
  [38, 41],
  [66, 46],
]

function rowStyle(row: number) {
  return { '--d': `${(row * ROW_STEP - CYCLE).toFixed(2)}s` } as React.CSSProperties
}

export function HeroField() {
  const width = COLS * PITCH
  const height = ROWS * PITCH
  const rows = Array.from({ length: ROWS }, (_, r) => r)
  return (
    <figure className="field motion-scope">
      <svg
        className="field__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="field-desc"
        style={{ '--cycle': `${CYCLE}s` } as React.CSSProperties}
      >
        <desc id="field-desc">{field.description}</desc>
        <defs>
          {['pending', 'applied', 'hot'].map((kind) => (
            <pattern key={kind} id={`dot-${kind}`} width={PITCH} height={PITCH} patternUnits="userSpaceOnUse">
              <circle className={`field__dot field__dot--${kind}`} cx={PITCH / 2} cy={PITCH / 2} r={kind === 'pending' ? 1.1 : 1.4} />
            </pattern>
          ))}
        </defs>
        <rect width={width} height={height} fill="url(#dot-pending)" />
        {rows.map((r) => (
          <g key={r} style={rowStyle(r)}>
            <rect className="field__row motion" y={r * PITCH} width={width} height={PITCH} fill="url(#dot-applied)" />
            <rect className="field__hot motion" y={r * PITCH} width={width} height={PITCH} fill="url(#dot-hot)" />
          </g>
        ))}
        {RETRIED.map(([c, r]) => (
          <circle
            key={`${c}-${r}`}
            className="field__retry motion"
            style={rowStyle(r)}
            cx={c * PITCH + PITCH / 2}
            cy={r * PITCH + PITCH / 2}
            r={1.8}
          />
        ))}
      </svg>
      <figcaption className="field__caption">
        <span className="label">{field.label}</span>
        <span>{field.caption}</span>
        <span className="dg-legend">
          <span className="dg-key dg-key--ok">{field.legend.applied}</span>
          <span className="dg-key dg-key--fail">{field.legend.retried}</span>
        </span>
      </figcaption>
    </figure>
  )
}
