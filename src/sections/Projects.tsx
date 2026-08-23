import { BackgroundBoundary } from '../background/BackgroundBoundary'
import { BellField } from '../background/BellField'
import { StreamConvergence } from '../background/StreamConvergence'
import { projects, type ProjectArt } from '../content'

const ART: Record<ProjectArt, () => React.JSX.Element> = {
  stream: () => <StreamConvergence speed={0.8} />,
  bell: () => <BellField emberAmount={0.7} />,
}

export function Projects() {
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <header className="section__head">
        <span className="section__index">04</span>
        <h2 id="projects-title" className="section__title">
          Selected <em>projects</em>
        </h2>
      </header>
      <ul className="project-grid">
        {projects.map((project) => {
          const Art = ART[project.art]
          return (
            <li key={project.name}>
              <a className="project" href={project.url} target="_blank" rel="noopener noreferrer">
                <span className="project__art" aria-hidden="true">
                  <BackgroundBoundary fallback={<span className="shader shader--static" />}>
                    <Art />
                  </BackgroundBoundary>
                </span>
                <span className="project__body">
                  <span className="project__name">
                    {project.name}
                    <span className="project__arrow" aria-hidden="true">
                      ↗
                    </span>
                  </span>
                  <span className="project__summary">{project.summary}</span>
                  <span className="project__detail">{project.detail}</span>
                  <span className="tags" aria-label="Stack">
                    {project.stack.map((item) => (
                      <span key={item} className="tag">
                        {item}
                      </span>
                    ))}
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
