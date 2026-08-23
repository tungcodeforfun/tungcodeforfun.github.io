import { BackgroundBoundary } from '../background/BackgroundBoundary'
import { BellField } from '../background/BellField'
import { StreamConvergence } from '../background/StreamConvergence'
import { projects, type ProjectArt } from '../content'

const ART: Record<ProjectArt, { render: () => React.JSX.Element; label: string }> = {
  stream: { render: () => <StreamConvergence speed={0.8} />, label: 'stream-convergence' },
  bell: { render: () => <BellField emberAmount={0.7} />, label: 'bell-field' },
}

export function Projects() {
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <header className="section__head">
        <h2 id="projects-title" className="section__title">
          Projects
        </h2>
        <span className="section__meta">{projects.length} public repos</span>
      </header>
      <ul className="project-grid">
        {projects.map((project) => {
          const art = ART[project.art]
          return (
            <li key={project.name}>
              <a className="project" href={project.url} target="_blank" rel="noopener noreferrer">
                <span className="screen project__art" aria-hidden="true">
                  <BackgroundBoundary fallback={<span className="shader shader--static" />}>
                    {art.render()}
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
