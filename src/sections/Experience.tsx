import { education, experience, skills } from '../content'

export function Experience() {
  return (
    <section className="section" id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title">Experience</h2>
      <p>
        {experience.heading} <span className="muted">{experience.period}</span>
        <br />
        {experience.client}
      </p>
      {experience.roles.map((role) => (
        <div key={role.title} className="role">
          <h3>
            {role.title} <span className="muted">{role.period}</span>
          </h3>
          <ul className="bullets">
            {role.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
      <h3>Skills</h3>
      {skills.map((s) => (
        <p key={s.label} className="skill">
          <b>{s.label}:</b> {s.items}
        </p>
      ))}
      <h3>Education</h3>
      <p>{education.text}</p>
    </section>
  )
}
