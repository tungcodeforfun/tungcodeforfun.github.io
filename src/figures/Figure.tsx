import type { CSSProperties, ReactNode } from 'react'
import type { CaseStudy } from '../content'
import { keyframes, type Track } from './motion'

export type FigureProps = { meta: CaseStudy['figure'] }

export function Figure({
  meta,
  width,
  height,
  cycle,
  tracks,
  children,
}: FigureProps & { width: number; height: number; cycle: number; tracks: Track[]; children: ReactNode }) {
  const id = `fig-${meta.id}`
  return (
    <figure className="fig motion-scope">
      <svg
        className="fig__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        style={{ '--cycle': `${cycle}s` } as CSSProperties}
      >
        <title id={`${id}-title`}>{meta.title}</title>
        <desc id={`${id}-desc`}>{meta.description}</desc>
        <style dangerouslySetInnerHTML={{ __html: keyframes(cycle, tracks) }} />
        {children}
      </svg>
      <label className="fig__pause">
        <input type="checkbox" className="fig__toggle" aria-label={`Pause: ${meta.title}`} />
      </label>
      <figcaption>{meta.caption}</figcaption>
    </figure>
  )
}

export function Token({ path, track, color }: { path: string; track: string; color: string }) {
  return <circle className={`tok ${color} motion ${track}`} r="7" style={{ offsetPath: `path('${path}')` }} />
}
