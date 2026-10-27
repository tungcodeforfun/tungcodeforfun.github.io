import { caseStudies, ey } from '../content'
import { CaseStudy } from './CaseStudy'

export function Work() {
  return (
    <section className="section" id="work" aria-labelledby="work-title">
      <div className="section__head">
        <h2 id="work-title">Work</h2>
        <p className="lede">{ey.intro}</p>
      </div>
      {caseStudies.map((study) => (
        <CaseStudy key={study.id} study={study} />
      ))}
    </section>
  )
}
