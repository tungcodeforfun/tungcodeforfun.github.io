import type { CaseStudy as Study } from '../content'
import { figures } from '../figures'
import { Prose } from './Prose'

export function CaseStudy({ study }: { study: Study }) {
  const Figure = figures[study.figure.id]
  return (
    <article className="case" id={study.id} aria-labelledby={`${study.id}-title`}>
      <h3 id={`${study.id}-title`}>{study.title}</h3>
      {study.body.map((text) => (
        <Prose key={text} text={text} />
      ))}
      <Figure meta={study.figure} />
    </article>
  )
}
