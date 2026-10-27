import { caseStudies, experience } from '../content'
import { CaseStudy } from './CaseStudy'

export function Systems() {
  return (
    <section className="section" id="systems" aria-labelledby="systems-title">
      <header className="section__head">
        <p className="label">01</p>
        <h2 id="systems-title">Systems</h2>
        <p className="section__sub">
          {experience.company}, {experience.client.toLowerCase()}
        </p>
      </header>
      {caseStudies.map((study) => (
        <CaseStudy key={study.id} study={study} />
      ))}
    </section>
  )
}
