import type { CaseStudy as Study } from '../content'
import { Diagram } from '../diagram/Diagram'

export function CaseStudy({ study }: { study: Study }) {
  return (
    <article
      className={study.results.length > 1 ? 'case case--multi' : 'case'}
      id={study.id}
      aria-labelledby={`${study.id}-title`}
    >
      <header className="case__head">
        <h3 id={`${study.id}-title`} className="case__title">
          {study.title}
        </h3>
        <p className="case__problem">{study.problem}</p>
      </header>
      <Diagram id={study.id} label={study.figure} spec={study.diagram} legend={study.legend} />
      <div className="case__notes">
        <div className="case__decisions">
          <h4 className="label">Decision</h4>
          <ul>
            {study.decisions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="case__results">
          <h4 className="label">Result</h4>
          <dl>
            {study.results.map((r) => (
              <div key={r.label}>
                <dt>{r.value}</dt>
                <dd>{r.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="case__stack">
          <h4 className="label">Stack</h4>
          <ul>
            {study.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
