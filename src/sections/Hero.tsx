import { links, profile } from '../content'

export function Hero() {
  return (
    <header className="hero">
      <h1>{profile.name}</h1>
      <p className="hero__role">
        {profile.role}, {profile.location}
      </p>
      <p className="hero__intro">{profile.intro}</p>
      <p className="hero__links">
        {links.map((link, i) => (
          <span key={link.href}>
            {i > 0 && ', '}
            <a href={link.href}>{link.label}</a>
          </span>
        ))}
      </p>
    </header>
  )
}
