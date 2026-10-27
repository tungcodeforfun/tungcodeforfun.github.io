import { profile } from '../content'

export function Contact() {
  return (
    <section className="section" id="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">Contact</h2>
      <p>
        Email me at <a href={`mailto:${profile.email}`}>{profile.email}</a>. I am also on{' '}
        <a href={profile.github}>GitHub</a> and <a href={profile.linkedin}>LinkedIn</a>, and my résumé is a{' '}
        <a href={profile.resume}>PDF</a>.
      </p>
    </section>
  )
}
