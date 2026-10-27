import { caseStudies, ey } from '../content'
import { CaseStudy } from './CaseStudy'

export function Work() {
  return (
    <section className="section" id="work" aria-labelledby="work-title">
      <h2 id="work-title">Work</h2>
      <p>{ey.intro}</p>
      {caseStudies.map((study) => (
        <CaseStudy key={study.id} study={study} />
      ))}
    </section>
  )
}
