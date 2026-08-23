import { BackgroundBoundary } from '../background/BackgroundBoundary'
import { RibbonField } from '../background/RibbonField'
import { freelance, profile } from '../content'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="screen hero__screen">
        <BackgroundBoundary fallback={<div className="shader shader--static" aria-hidden="true" />}>
          <RibbonField />
        </BackgroundBoundary>
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__chrome" aria-hidden="true">
          <span>
            <span className="hero__chrome-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="hero__chrome-label">tungcodeforfun.github.io</span>
          </span>
          <span>ribbon-field</span>
        </div>
        <div className="hero__copy">
          <div className="tags reveal" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <span className="tag tag--on">{profile.role}</span>
            <span className="tag">{profile.location}</span>
          </div>
          <h1 id="hero-title" className="hero__title reveal" style={{ '--delay': '90ms' } as React.CSSProperties}>
            {profile.name}
          </h1>
          <p className="hero__line reveal" style={{ '--delay': '180ms' } as React.CSSProperties}>
            {profile.line}
          </p>
          <div className="hero__actions reveal" style={{ '--delay': '270ms' } as React.CSSProperties}>
            <a className="button button--primary" href={freelance.bookingUrl}>
              Book a call
            </a>
            <a className="button button--ghost" href={profile.github} target="_blank" rel="noopener noreferrer">
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
