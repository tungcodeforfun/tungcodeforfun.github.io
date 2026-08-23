import { freelance } from '../content'

export function Freelance() {
  return (
    <section id="hire" className="section" aria-labelledby="hire-title">
      <header className="section__head">
        <span className="section__index">02</span>
        <h2 id="hire-title" className="section__title">
          Contract <em>work</em>
        </h2>
      </header>
      <ul className="offer-list">
        {freelance.offers.map((offer) => (
          <li key={offer.title} className="offer">
            <h3 className="offer__title">{offer.title}</h3>
            <p className="offer__body">{offer.body}</p>
          </li>
        ))}
      </ul>
      <div className="hire__foot">
        <ul className="hire__process" aria-label="How an engagement runs">
          {freelance.process.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <div className="hire__actions">
          <a className="button button--primary" href={freelance.bookingUrl}>
            Book a call
          </a>
          {freelance.resumeUrl && (
            <a className="button button--ghost" href={freelance.resumeUrl} target="_blank" rel="noopener noreferrer">
              Resume <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
