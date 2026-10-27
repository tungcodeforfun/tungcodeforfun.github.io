import { education, experience, skills } from '../content'

export function Experience() {
  return (
    <section className="section" id="experience" aria-labelledby="experience-title">
      <header className="section__head">
        <p className="label">03</p>
        <h2 id="experience-title">Experience</h2>
        <p className="section__sub">
          {experience.company}, {experience.unit}
          <span className="section__meta">
            {experience.location} · {experience.period}
          </span>
        </p>
      </header>
      <p className="timeline__client label">{experience.client}</p>
      <ol className="timeline">
        {experience.roles.map((role) => (
          <li key={role.title} className="timeline__role">
            <p className="timeline__period label">{role.period}</p>
            <div>
              <h3 className="timeline__title">{role.title}</h3>
              <ul className="timeline__bullets">
                {role.bullets.map((b) => (
                  <li key={b.text}>
                    {b.text}
                    {b.figure && (
                      <>
                        {' '}
                        <a className="figref" href={b.figure.href}>
                          {b.figure.label}
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
        <li className="timeline__role">
          <p className="timeline__period label">{education.date}</p>
          <div>
            <h3 className="timeline__title">
              {education.school}, {education.degree}
            </h3>
            <ul className="timeline__bullets">
              <li>{education.honors.join(', ')}</li>
              <li>Certification: {education.certification}</li>
            </ul>
          </div>
        </li>
      </ol>
      <dl className="skills">
        {skills.map((s) => (
          <div key={s.label}>
            <dt className="label">{s.label}</dt>
            <dd>{s.items}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
