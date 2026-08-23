import { freelance, profile } from '../content'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <p className="eyebrow reveal" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <span>{profile.role}</span>
        <span className="eyebrow__sep" aria-hidden="true">
          /
        </span>
        <span>{profile.location}</span>
      </p>
      <h1 id="hero-title" className="hero__title reveal" style={{ '--delay': '120ms' } as React.CSSProperties}>
        Tung <em>Nguyen</em>
      </h1>
      <div className="hero__actions reveal" style={{ '--delay': '260ms' } as React.CSSProperties}>
        <a className="button button--primary" href={freelance.bookingUrl}>
          Book a call
        </a>
        <a className="button button--ghost" href={profile.github} target="_blank" rel="noopener noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
      <a className="hero__scroll reveal" href="#work" style={{ '--delay': '560ms' } as React.CSSProperties}>
        <span className="hero__scroll-line" aria-hidden="true" />
        scroll
      </a>
    </section>
  )
}
