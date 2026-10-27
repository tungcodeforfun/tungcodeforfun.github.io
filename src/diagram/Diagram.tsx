import { layout, type Layout, type Variant } from './layout'
import type { DiagramSpec, Tone } from './spec'

const TONES: Tone[] = ['ok', 'alt', 'fail']

function pct(seconds: number, cycle: number) {
  return `${((seconds / cycle) * 100).toFixed(2)}%`
}

function keyframes(scope: string, l: Layout): string {
  const at = (s: number) => pct(s, l.cycle)
  const tokens = l.tokens.map(
    (t, i) =>
      `@keyframes ${scope}-t${i}{0%,${at(t.from)}{offset-distance:0px;opacity:0}${at(t.from + 0.15)}{opacity:1}` +
      `${at(t.to)}{offset-distance:${t.length}px;opacity:1}${at(t.to + 0.3)},100%{offset-distance:${t.length}px;opacity:0}}` +
      `.${scope}-t${i}{animation-name:${scope}-t${i}}`,
  )
  const pulses = l.pulses.map(
    (p, i) =>
      `@keyframes ${scope}-p${i}{0%,${at(p.at)}{opacity:0}${at(p.at + 0.1)}{opacity:1}${at(p.at + 1)},100%{opacity:0}}` +
      `.${scope}-p${i}{animation-name:${scope}-p${i}}`,
  )
  return [...tokens, ...pulses].join('')
}

function Figure({ id, spec, variant }: { id: string; spec: DiagramSpec; variant: Variant }) {
  const l = layout(spec, variant)
  const scope = `${id}-${variant}`
  return (
    <svg
      className={`dg-svg dg-svg--${variant}`}
      viewBox={`0 0 ${l.width} ${l.height}`}
      role="img"
      aria-labelledby={`${scope}-title ${scope}-desc`}
      style={{ '--cycle': `${l.cycle}s` } as React.CSSProperties}
    >
      <title id={`${scope}-title`}>{spec.title}</title>
      <desc id={`${scope}-desc`}>{spec.description}</desc>
      <style dangerouslySetInnerHTML={{ __html: keyframes(scope, l) }} />
      <defs>
        {['plain', 'alert'].map((kind) => (
          <marker
            key={kind}
            id={`${scope}-arrow-${kind}`}
            viewBox="0 0 8 8"
            refX="7.5"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0.5 L8 4 L0 7.5 z" className={`dg-arrow dg-arrow--${kind}`} />
          </marker>
        ))}
      </defs>
      {l.groups.map((g) => (
        <g key={g.label} className="dg-group">
          <rect x={g.x} y={g.y} width={g.w} height={g.h} />
          <text x={g.x} y={g.y - 7}>
            {g.label}
          </text>
        </g>
      ))}
      {l.edges.map((e, i) => (
        <g key={i} className={`dg-edge dg-edge--${e.kind}`}>
          <path d={e.d} markerEnd={`url(#${scope}-arrow-${e.kind === 'plain' ? 'plain' : 'alert'})`} />
          {e.label && (
            <text x={e.label.x} y={e.label.y} textAnchor={e.label.anchor}>
              {e.label.text}
            </text>
          )}
        </g>
      ))}
      {l.tokens.map((t, i) => (
        <rect
          key={`t${i}`}
          className={`dg-tok dg-tok--${t.tone} motion ${scope}-t${i}`}
          x={-4}
          y={-4}
          width={8}
          height={8}
          style={{ offsetPath: `path('${t.d}')` }}
        />
      ))}
      {l.nodes.map((n) => (
        <g key={n.id} className={n.alert ? 'dg-node dg-node--alert' : 'dg-node'}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} />
          {n.lines.map((line, i) => (
            <text key={i} className={line.detail ? 'dg-detail' : 'dg-label'} x={line.x} y={line.y}>
              {line.text}
            </text>
          ))}
        </g>
      ))}
      {l.pulses.map((p, i) => (
        <rect
          key={`p${i}`}
          className={`dg-pulse dg-pulse--${p.tone} motion ${scope}-p${i}`}
          x={p.box.x - 4}
          y={p.box.y - 4}
          width={p.box.w + 8}
          height={p.box.h + 8}
        />
      ))}
    </svg>
  )
}

export function Diagram({
  id,
  label,
  spec,
  legend,
}: {
  id: string
  label: string
  spec: DiagramSpec
  legend: Partial<Record<Tone, string>>
}) {
  return (
    <figure className="dg motion-scope">
      <div className="dg-frame">
        <Figure id={id} spec={spec} variant="wide" />
        <Figure id={id} spec={spec} variant="narrow" />
      </div>
      <figcaption className="dg-caption">
        <span className="label">{label}</span>
        <span className="dg-title">{spec.title}</span>
        <span className="dg-legend">
          {TONES.filter((tone) => legend[tone]).map((tone) => (
            <span key={tone} className={`dg-key dg-key--${tone}`}>
              {legend[tone]}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
