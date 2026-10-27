import type { CSSProperties, ReactNode } from 'react'
import type { CaseStudy } from '../content'

export type FigureProps = { meta: CaseStudy['figure'] }

export function Figure({
  meta,
  width,
  height,
  cycle,
  keyframes,
  children,
}: FigureProps & { width: number; height: number; cycle: number; keyframes: string; children: ReactNode }) {
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
        <style dangerouslySetInnerHTML={{ __html: keyframes }} />
        {children}
      </svg>
      <div className="fig__bar">
        <button type="button" className="fig__pause" data-pause hidden aria-pressed="false" aria-label={`Pause: ${meta.title}`} />
        <figcaption>{meta.caption}</figcaption>
      </div>
    </figure>
  )
}
