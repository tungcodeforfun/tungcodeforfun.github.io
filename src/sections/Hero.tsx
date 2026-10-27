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
          <div className="hero__id">
            <h1 id="hero-name">{profile.name}</h1>
            <p className="hero__role">
              {profile.role}, {profile.location}
            </p>
          </div>
          <p className="hero__headline">{profile.headline}</p>
          <p className="hero__also">{profile.also}</p>
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
