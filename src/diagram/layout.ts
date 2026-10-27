import type { Bend, DiagramEdge, DiagramSpec, Tone } from './spec'

export type Variant = 'wide' | 'narrow'

type Pt = readonly [number, number]

export type NodeBox = {
  id: string
  x: number
  y: number
  w: number
  h: number
  lines: { x: number; y: number; text: string; detail: boolean }[]
  alert: boolean
}

export type EdgeLine = {
  d: string
  kind: 'plain' | 'retry' | 'fail'
  label?: { x: number; y: number; text: string; anchor: 'middle' | 'start' }
}

export type GroupBox = { label: string; x: number; y: number; w: number; h: number }

export type Token = { tone: Tone; d: string; length: number; from: number; to: number }

export type Pulse = { tone: Tone; box: NodeBox; at: number }

export type Layout = {
  width: number
  height: number
  nodes: NodeBox[]
  edges: EdgeLine[]
  groups: GroupBox[]
  tokens: Token[]
  pulses: Pulse[]
  cycle: number
}

const METRICS = {
  wide: { width: 960, pad: 16, gapX: 56, gapY: 60, label: 13, detail: 11.5, top: 44 },
  narrow: { width: 340, pad: 8, gapX: 20, gapY: 48, label: 12, detail: 10.5, top: 40 },
} as const

const MONO_ADVANCE = 0.6
const NODE_PAD_X = 10
const LOOP_OFFSET = 22
const SPEED_PER_WIDTH = 0.3

export function wrap(text: string, size: number, maxWidth: number): string[] {
  const perLine = Math.max(1, Math.floor(maxWidth / (size * MONO_ADVANCE)))
  const words = text.split(/(?<=-)|\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const joiner = line === '' || line.endsWith('-') ? '' : ' '
    if (line !== '' && (line + joiner + word).length > perLine) {
      lines.push(line)
      line = word
    } else {
      line += joiner + word
    }
  }
  if (line) lines.push(line)
  return lines
}

function placeNodes(spec: DiagramSpec, variant: Variant): NodeBox[] {
  const m = METRICS[variant]
  const cols = Math.max(...spec.nodes.map((n) => n[variant][0])) + 1
  const colW = (m.width - m.pad * 2) / cols
  const w = colW - m.gapX
  const inner = w - NODE_PAD_X * 2
  const sized = spec.nodes.map((node) => {
    const label = wrap(node.label, m.label, inner)
    const detail = node.detail ? wrap(node.detail, m.detail, inner) : []
    const h = 14 + label.length * (m.label + 4) + (detail.length ? 4 + detail.length * (m.detail + 3) : 0) + 10
    return { node, label, detail, h }
  })
  const rows = Math.max(...spec.nodes.map((n) => n[variant][1])) + 1
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(0, ...sized.filter((s) => s.node[variant][1] === r).map((s) => s.h)),
  )
  const top = spec.groups?.length || spec.edges.some((e) => e.loop) ? m.top : 16
  const rowTop = rowH.map((_, r) => top + rowH.slice(0, r).reduce((a, h) => a + h + m.gapY, 0))
  return sized.map(({ node, label, detail, h }) => {
    const [c, r] = node[variant]
    const x = m.pad + colW * c + m.gapX / 2
    const y = rowTop[r]
    const textTop = y + (rowH[r] - h) / 2
    const detailTop = textTop + 14 + label.length * (m.label + 4) + 4
    return {
      id: node.id,
      x,
      y,
      w,
      h: rowH[r],
      lines: [
        ...label.map((text, i) => ({ x: x + NODE_PAD_X, y: textTop + 14 + m.label * 0.8 + i * (m.label + 4), text, detail: false })),
        ...detail.map((text, i) => ({ x: x + NODE_PAD_X, y: detailTop + m.detail * 0.8 + i * (m.detail + 3), text, detail: true })),
      ],
      alert: node.alert ?? false,
    }
  })
}

const cx = (b: NodeBox) => b.x + b.w / 2
const cy = (b: NodeBox) => b.y + b.h / 2
const sameRow = (a: NodeBox, b: NodeBox) => Math.abs(cy(a) - cy(b)) < 1
const segLength = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1])
const round = (n: number) => Math.round(n * 10) / 10

function horizontal(a: NodeBox, b: NodeBox): Pt[] {
  const forward = cx(b) > cx(a)
  return [
    [forward ? a.x + a.w : a.x, cy(a)],
    [forward ? b.x : b.x + b.w, cy(b)],
  ]
}

function vertical(a: NodeBox, b: NodeBox): Pt[] {
  const down = cy(b) > cy(a)
  return [
    [cx(a), down ? a.y + a.h : a.y],
    [cx(b), down ? b.y : b.y + b.h],
  ]
}

function loop(a: NodeBox, b: NodeBox): Pt[] {
  if (sameRow(a, b)) {
    const y = Math.min(a.y, b.y) - LOOP_OFFSET
    return [[cx(a), a.y], [cx(a), y], [cx(b), y], [cx(b), b.y]]
  }
  const x = Math.min(a.x, b.x) - LOOP_OFFSET / 2
  return [[a.x, cy(a)], [x, cy(a)], [x, cy(b)], [b.x, cy(b)]]
}

function elbow(a: NodeBox, b: NodeBox, bend: Bend): Pt[] {
  const down = cy(b) > cy(a)
  const right = cx(b) > cx(a)
  if (bend === 'vh') {
    return [[cx(a), down ? a.y + a.h : a.y], [cx(a), cy(b)], [right ? b.x : b.x + b.w, cy(b)]]
  }
  return [[right ? a.x + a.w : a.x, cy(a)], [cx(b), cy(a)], [cx(b), down ? b.y : b.y + b.h]]
}

function route(edge: DiagramEdge, a: NodeBox, b: NodeBox, variant: Variant): Pt[] {
  if (edge.loop) return loop(a, b)
  if (sameRow(a, b)) return horizontal(a, b)
  if (Math.abs(cx(a) - cx(b)) < 1) return vertical(a, b)
  const bend = typeof edge.bend === 'string' ? edge.bend : edge.bend?.[variant]
  return elbow(a, b, bend ?? 'vh')
}

function pathOf(points: Pt[]): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ')
}

function edgeLabel(points: Pt[], text: string): EdgeLine['label'] {
  let best = 1
  for (let i = 2; i < points.length; i++) {
    if (segLength(points[i - 1], points[i]) > segLength(points[best - 1], points[best])) best = i
  }
  const [p, q] = [points[best - 1], points[best]]
  const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  return p[1] === q[1]
    ? { x: round(mid[0]), y: round(mid[1] - 7), text, anchor: 'middle' }
    : { x: round(mid[0] + 7), y: round(mid[1] + 4), text, anchor: 'start' }
}

function groupBoxes(spec: DiagramSpec, nodes: Map<string, NodeBox>): GroupBox[] {
  const pad = 10
  return (spec.groups ?? []).map((group) => {
    const boxes = group.nodes.map((id) => nodes.get(id)!)
    const x = Math.min(...boxes.map((b) => b.x)) - pad
    const y = Math.min(...boxes.map((b) => b.y)) - pad
    const w = Math.max(...boxes.map((b) => b.x + b.w)) + pad - x
    const h = Math.max(...boxes.map((b) => b.y + b.h)) + pad - y
    return { label: group.label, x, y, w, h }
  })
}

function edgePoints(spec: DiagramSpec, nodes: Map<string, NodeBox>, variant: Variant) {
  const byKey = new Map<string, Pt[]>()
  const lines = spec.edges.map((edge) => {
    const points = route(edge, nodes.get(edge.from)!, nodes.get(edge.to)!, variant)
    byKey.set(`${edge.from}>${edge.to}`, points)
    const line: EdgeLine = { d: pathOf(points), kind: edge.kind ?? 'plain' }
    if (edge.label) line.label = edgeLabel(points, edge.label)
    return line
  })
  return { lines, byKey }
}

function stitch(spec: DiagramSpec, ids: string[], byKey: Map<string, Pt[]>): Pt[] {
  const points: Pt[] = []
  for (let i = 1; i < ids.length; i++) {
    const forward = byKey.get(`${ids[i - 1]}>${ids[i]}`)
    const backward = byKey.get(`${ids[i]}>${ids[i - 1]}`)
    const leg = forward ?? (backward && [...backward].reverse())
    if (!leg) throw new Error(`Diagram "${spec.title}": no edge between ${ids[i - 1]} and ${ids[i]}`)
    points.push(...(points.length ? leg.slice(1) : leg))
  }
  return points
}

function schedule(spec: DiagramSpec, byKey: Map<string, Pt[]>, nodes: Map<string, NodeBox>, width: number) {
  const speed = width * SPEED_PER_WIDTH
  const tokens: Token[] = []
  const pulses: Pulse[] = []
  let start = 0
  for (const flow of spec.flows) {
    const points = stitch(spec, flow.route, byKey)
    const length = points.slice(1).reduce((sum, p, i) => sum + segLength(points[i], p), 0)
    const duration = length / speed
    tokens.push({ tone: flow.tone, d: pathOf(points), length: round(length), from: start, to: start + duration })
    pulses.push({ tone: flow.tone, box: nodes.get(flow.route.at(-1)!)!, at: start + duration })
    start += Math.max(1.2, duration * 0.45)
  }
  const cycle = Math.max(...tokens.map((t) => t.to)) + 1.4
  return { tokens, pulses, cycle: round(cycle) }
}

function checkNodes(spec: DiagramSpec) {
  const ids = new Set(spec.nodes.map((n) => n.id))
  const refs = [
    ...spec.edges.flatMap((e) => [e.from, e.to]),
    ...spec.flows.flatMap((f) => f.route),
    ...(spec.groups ?? []).flatMap((g) => g.nodes),
  ]
  const missing = refs.filter((id) => !ids.has(id))
  if (missing.length) throw new Error(`Diagram "${spec.title}": unknown nodes ${missing.join(', ')}`)
}

export function layout(spec: DiagramSpec, variant: Variant): Layout {
  checkNodes(spec)
  const boxes = placeNodes(spec, variant)
  const nodes = new Map(boxes.map((b) => [b.id, b]))
  const { lines, byKey } = edgePoints(spec, nodes, variant)
  const { tokens, pulses, cycle } = schedule(spec, byKey, nodes, METRICS[variant].width)
  return {
    width: METRICS[variant].width,
    height: Math.ceil(Math.max(...boxes.map((b) => b.y + b.h)) + 16),
    nodes: boxes,
    edges: lines,
    groups: groupBoxes(spec, nodes),
    tokens,
    pulses,
    cycle,
  }
}
