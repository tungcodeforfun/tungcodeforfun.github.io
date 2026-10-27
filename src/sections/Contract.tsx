import { contract } from '../content'

export function Contract() {
  return (
    <section className="section" id="contract" aria-labelledby="contract-title">
      <h2 id="contract-title">Contract work</h2>
      <p>{contract.intro}</p>
      <ul className="offers">
        {contract.offers.map((offer) => (
          <li key={offer.title}>
            <b>{offer.title}</b> {offer.body}
          </li>
        ))}
      </ul>
      <p>{contract.process}</p>
      <p>
        <a href={contract.bookingUrl}>{contract.bookingLabel}</a>
      </p>
    </section>
  )
}
