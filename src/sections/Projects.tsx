import { projects } from '../content'

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
        {projects.map((project) => (
          <li key={project.name}>
            <a className="project" href={project.url} target="_blank" rel="noopener noreferrer">
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
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
