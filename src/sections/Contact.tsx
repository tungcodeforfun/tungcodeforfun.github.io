import { profile } from '../content'

export function Contact() {
  return (
    <section id="contact" className="section section--contact" aria-labelledby="contact-title">
      <header className="section__head">
        <span className="section__index">04</span>
        <h2 id="contact-title" className="section__title">
          Say <em>hello</em>
        </h2>
      </header>
      <a className="contact__email" href={`mailto:${profile.email}`}>
        {profile.email}
      </a>
      <ul className="contact__links">
        <li>
          <a href={profile.github} target="_blank" rel="noopener noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </li>
        <li>
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </li>
        <li>
          <span>{profile.location}</span>
        </li>
      </ul>
    </section>
  )
}
