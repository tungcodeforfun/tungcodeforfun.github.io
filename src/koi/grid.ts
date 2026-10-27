export const Ink = {
  Water: 1,
  Ripple: 2,
  White: 3,
  Red: 4,
  WhiteFin: 5,
  Sumi: 6,
  Gold: 7,
  SumiFin: 8,
  Eye: 9,
} as const

export type InkId = (typeof Ink)[keyof typeof Ink]

export type Grid = {
  cols: number
  rows: number
  cellW: number
  cellH: number
  glyph: Uint16Array
  ink: Uint8Array
  alpha: Uint8Array
  used: Int32Array
  count: number
}

export function createGrid(cols: number, rows: number, cellW: number, cellH: number): Grid {
  const size = cols * rows
  return {
    cols,
    rows,
    cellW,
    cellH,
    glyph: new Uint16Array(size),
    ink: new Uint8Array(size),
    alpha: new Uint8Array(size),
    used: new Int32Array(size),
    count: 0,
  }
}

export function clearGrid(grid: Grid) {
  for (let i = 0; i < grid.count; i++) {
    const cell = grid.used[i]
    grid.glyph[cell] = 0
    grid.ink[cell] = 0
  }
  grid.count = 0
}

export function put(grid: Grid, col: number, row: number, glyph: string, ink: number, alpha = 255) {
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return
  const cell = row * grid.cols + col
  if (!grid.ink[cell]) grid.used[grid.count++] = cell
  grid.glyph[cell] = glyph.charCodeAt(0)
  grid.ink[cell] = ink
  grid.alpha[cell] = alpha
}
