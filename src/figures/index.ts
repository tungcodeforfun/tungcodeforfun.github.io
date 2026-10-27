import type { ComponentType } from 'react'
import type { FigureId } from '../content'
import { CacheFigure } from './CacheFigure'
import type { FigureProps } from './Figure'
import { MatchFigure } from './MatchFigure'
import { MenuFigure } from './MenuFigure'
import { QueueFigure } from './QueueFigure'

export const figures: Record<FigureId, ComponentType<FigureProps>> = {
  queue: QueueFigure,
  menu: MenuFigure,
  cache: CacheFigure,
  match: MatchFigure,
}
