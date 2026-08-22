import { education, experience } from '../content'

export function Experience() {
  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <header className="section__head">
        <span className="section__index">02</span>
        <h2 id="experience-title" className="section__title">
          <em>Experience</em>
        </h2>
      </header>
      <ol className="timeline">
        {experience.map((role) => (
          <li key={role.start} className="role">
            <p className="role__period">
              <time dateTime={role.start}>{role.period}</time>
            </p>
            <div className="role__body">
              <h3 className="role__title">
                {role.title} <span className="role__company">{role.company}</span>
              </h3>
              <ul className="role__bullets">
                {role.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <ul className="tags" aria-label="Technologies">
                {role.skills.map((skill) => (
                  <li key={skill} className="tag">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
        <li className="role role--education">
          <p className="role__period">
            <time dateTime="2022">2022</time>
          </p>
          <div className="role__body">
            <h3 className="role__title">
              {education.degree} <span className="role__company">{education.school}</span>
            </h3>
            <p className="role__note">{education.honors}</p>
          </div>
        </li>
      </ol>
    </section>
  )
}
