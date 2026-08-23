import { BackgroundBoundary } from '../background/BackgroundBoundary'
import { LiquidForm } from '../background/LiquidForm'
import { profile } from '../content'

export function Contact() {
  return (
    <section id="contact" className="section section--contact" aria-labelledby="contact-title">
      <header className="section__head">
        <h2 id="contact-title" className="section__title">
          Say hello
        </h2>
        <span className="section__meta">{profile.location}</span>
      </header>
      <div className="contact__grid">
        <div className="contact__body">
          <a className="contact__email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <div className="contact__links">
            <a className="button button--ghost" href={profile.github} target="_blank" rel="noopener noreferrer">
              GitHub <span aria-hidden="true">↗</span>
            </a>
            <a className="button button--ghost" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div className="screen contact__art" aria-hidden="true">
          <BackgroundBoundary fallback={<div className="shader shader--static" />}>
            <LiquidForm />
          </BackgroundBoundary>
        </div>
      </div>
    </section>
  )
}
