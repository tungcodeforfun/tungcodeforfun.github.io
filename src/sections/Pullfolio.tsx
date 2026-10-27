import { projects, pullfolio } from '../content'
import { CaseStudy } from './CaseStudy'

type Shot = (typeof pullfolio.shots)[keyof typeof pullfolio.shots]

function Screen({ shot }: { shot: Shot }) {
  return (
    <img
      src={shot.src}
      width={shot.width}
      height={shot.height}
      alt={shot.alt}
      loading="lazy"
      decoding="async"
    />
  )
}

export function Pullfolio() {
  const { desktop, detail, phone } = pullfolio.shots
  return (
    <section className="section" id="pullfolio" aria-labelledby="pullfolio-title">
      <div className="section__head">
        <h2 id="pullfolio-title">{pullfolio.name}</h2>
        {pullfolio.body.map((text) => (
          <p key={text} className="lede">
            {text}
          </p>
        ))}
        <p className="visit">
          <a href={pullfolio.url}>Visit {pullfolio.host}</a>
        </p>
      </div>
      <div className="devices" data-tilt>
        <div className="devices__rig">
        <a className="device device--browser" href={pullfolio.url} tabIndex={-1} aria-hidden="true">
          <span className="device__bar">
            <span className="device__lights" />
            <span className="device__url">{pullfolio.host}</span>
          </span>
          <Screen shot={desktop} />
        </a>
        <div className="device device--phone">
          <Screen shot={phone} />
        </div>
        <div className="device device--browser device--detail">
          <span className="device__bar">
            <span className="device__lights" />
            <span className="device__url">{pullfolio.host}</span>
          </span>
          <Screen shot={detail} />
        </div>
        </div>
      </div>
      <CaseStudy study={pullfolio.pipeline} />
      <div className="after">
        <p>{pullfolio.production}</p>
        {projects.map((project) => (
          <p key={project.name}>
            Also public: <a href={project.url}>{project.name}</a> {project.text}
          </p>
        ))}
      </div>
    </section>
  )
}
