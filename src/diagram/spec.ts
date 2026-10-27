export type Cell = readonly [col: number, row: number]

export type Bend = 'hv' | 'vh'

export type DiagramNode = {
  id: string
  label: string
  detail?: string
  alert?: boolean
  wide: Cell
  narrow: Cell
}

export type DiagramEdge = {
  from: string
  to: string
  label?: string
  kind?: 'retry' | 'fail'
  loop?: boolean
  bend?: Bend | { wide?: Bend; narrow?: Bend }
}

export type Tone = 'ok' | 'alt' | 'fail'

export type DiagramFlow = {
  route: string[]
  tone: Tone
}

export type DiagramGroup = {
  label: string
  nodes: string[]
}

export type DiagramSpec = {
  title: string
  description: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  flows: DiagramFlow[]
  groups?: DiagramGroup[]
}
