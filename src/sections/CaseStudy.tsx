import type { CaseStudy as Study } from '../content'
import { Prose } from './Prose'
import { Simulation } from './Simulation'

export function CaseStudy({ study }: { study: Study }) {
  return (
    <article className="case" id={study.id} aria-labelledby={`${study.id}-title`}>
      <div className="case__text">
        <h3 id={`${study.id}-title`}>{study.title}</h3>
        {study.body.map((text, i) => (
          <Prose key={text} text={text} cue={study.cue?.paragraph === i ? study.cue.action : undefined} />
        ))}
      </div>
      <div className="case__sim">
        <Simulation sim={study.sim} />
      </div>
    </article>
  )
}
