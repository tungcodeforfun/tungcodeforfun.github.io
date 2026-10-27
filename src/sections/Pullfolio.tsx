import { projects, pullfolio } from '../content'
import { CaseStudy } from './CaseStudy'

export function Pullfolio() {
  return (
    <section className="section" id="pullfolio" aria-labelledby="pullfolio-title">
      <header className="section__head">
        <p className="label">02</p>
        <h2 id="pullfolio-title">{pullfolio.name}</h2>
        <p className="section__sub">
          <a href={pullfolio.url}>{pullfolio.host}</a>
          <span className="section__meta">{pullfolio.period}</span>
        </p>
      </header>
      <div className="product">
        <div className="product__intro">
          <p className="product__summary">{pullfolio.summary}</p>
          <ul className="product__features">
            {pullfolio.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="product__stack">{pullfolio.stack.join(' · ')}</p>
        </div>
        <div className="shots">
          {pullfolio.shots.map((shot) => (
            <figure key={shot.src} className={`shot shot--${shot.height > shot.width ? 'phone' : 'desktop'}`}>
              <img
                src={shot.src}
                width={shot.width}
                height={shot.height}
                alt={shot.alt}
                loading="lazy"
                decoding="async"
              />
              <figcaption className="label">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <CaseStudy study={pullfolio.pipeline} />
      <div className="production">
        <h3 className="label">In production</h3>
        <ul>
          {pullfolio.production.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="also">
        <h3 className="label">Also public</h3>
        {projects.map((p) => (
          <article key={p.name} className="also__item">
            <h4>
              <a href={p.url}>{p.name}</a>
            </h4>
            <p>{p.summary}</p>
            <p className="also__detail">{p.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
