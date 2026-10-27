import { contract } from '../content'

export function Contract() {
  return (
    <section className="section" id="contract" aria-labelledby="contract-title">
      <div className="section__head">
        <h2 id="contract-title">Contract work</h2>
        <p className="lede">{contract.intro}</p>
      </div>
      <ul className="offers">
        {contract.offers.map((offer) => (
          <li key={offer.title}>
            <h3>{offer.title}</h3>
            <p>{offer.body}</p>
          </li>
        ))}
      </ul>
      <p className="process">{contract.process}</p>
      <p>
        <a className="btn btn--strong" href={contract.bookingUrl}>
          {contract.bookingLabel}
        </a>
      </p>
    </section>
  )
}
