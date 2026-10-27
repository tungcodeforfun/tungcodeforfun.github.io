import { hero, links, profile } from '../content'
import { Prose } from './Prose'
import { stills } from './stills'

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-name">
      <div className="hero__stage">
        <div className="hero__still still" role="img" aria-label={hero.still} style={stills('hero')} />
        <div className="hero__scrim" />
        <div className="hero__copy">
          <h1 id="hero-name">{profile.name}</h1>
          <p className="hero__role">
            {profile.role}, {profile.location}
          </p>
          <p className="hero__summary">{profile.summary}</p>
          <ul className="hero__links">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <Prose className="hero__scene" text={hero.scene} />
      </div>
    </section>
  )
}
