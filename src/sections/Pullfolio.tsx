import { projects, pullfolio } from '../content'
import { CaseStudy } from './CaseStudy'

export function Pullfolio() {
  return (
    <section className="section" id="pullfolio" aria-labelledby="pullfolio-title">
      <h2 id="pullfolio-title">{pullfolio.name}</h2>
      {pullfolio.body.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <p>
        <a href={pullfolio.url}>{pullfolio.host}</a>
      </p>
      <div className="shots">
        {pullfolio.shots.map((shot) => (
          <a key={shot.src} className="shot" href={pullfolio.url}>
            <img src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} loading="lazy" decoding="async" />
          </a>
        ))}
      </div>
      <CaseStudy study={pullfolio.pipeline} />
      <p>{pullfolio.production}</p>
      {projects.map((project) => (
        <p key={project.name} className="also">
          Also public: <a href={project.url}>{project.name}</a> {project.text}
        </p>
      ))}
    </section>
  )
}
