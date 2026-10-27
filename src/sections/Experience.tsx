import { education, experience, skills } from '../content'

export function Experience() {
  return (
    <section className="section" id="experience" aria-labelledby="experience-title">
      <div className="section__head">
        <h2 id="experience-title">Experience</h2>
        <p className="lede">
          {experience.heading}, {experience.period}. {experience.client}
        </p>
      </div>
      <ol className="timeline">
        {experience.roles.map((role) => (
          <li key={role.title} className="timeline__role">
            <p className="timeline__period">{role.period}</p>
            <div>
              <h3>{role.title}</h3>
              <ul className="bullets">
                {role.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <div className="facts">
        <div>
          <h3>Skills</h3>
          {skills.map((s) => (
            <p key={s.label}>
              <b>{s.label}:</b> {s.items}
            </p>
          ))}
        </div>
        <div>
          <h3>Education</h3>
          <p>{education.text}</p>
        </div>
      </div>
    </section>
  )
}
