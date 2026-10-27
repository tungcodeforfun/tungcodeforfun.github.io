import { links, profile } from '../content'

export function Contact() {
  return (
    <section className="section contact" id="contact" aria-labelledby="contact-title">
      <header className="section__head">
        <p className="label">05</p>
        <h2 id="contact-title">Contact</h2>
        <p className="section__sub">
          {profile.name}, {profile.role}, {profile.location}
        </p>
      </header>
      <ul className="contact__links">
        {links.map((link) => (
          <li key={link.label}>
            <span className="label">{link.label}</span>
            <a href={link.href}>{link.text}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
