import { links, profile } from '../content'
import { HeroField } from './HeroField'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-name">
      <div className="hero__id">
        <h1 id="hero-name" className="hero__name">
          {profile.name}
        </h1>
        <p className="hero__role">
          {profile.role}
          <span className="hero__city">{profile.location}</span>
        </p>
        <dl className="facts">
          <div>
            <dt className="label">Experience</dt>
            <dd>{profile.experience}</dd>
          </div>
          <div>
            <dt className="label">Stack</dt>
            <dd>{profile.stack.join(', ')}</dd>
          </div>
          <div>
            <dt className="label">Now</dt>
            <dd>{profile.now}</dd>
          </div>
        </dl>
        <ul className="hero__links">
          {links.map((link) => (
            <li key={link.label}>
              <a href={link.href}>{link.short}</a>
            </li>
          ))}
        </ul>
      </div>
      <HeroField />
    </section>
  )
}
