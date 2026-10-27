import { contract, profile } from '../content'

export function Contract() {
  return (
    <section className="section" id="contract" aria-labelledby="contract-title">
      <header className="section__head">
        <p className="label">04</p>
        <h2 id="contract-title">Contract work</h2>
      </header>
      <ul className="offers">
        {contract.offers.map((o) => (
          <li key={o.title}>
            <h3>{o.title}</h3>
            <p>{o.body}</p>
          </li>
        ))}
      </ul>
      <div className="process">
        <h3 className="label">How it runs</h3>
        <ol>
          {contract.process.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p className="process__cta">
          <a className="button" href={contract.bookingUrl}>
            Email about a project
          </a>
          <a href={profile.resume}>Resume (PDF)</a>
        </p>
      </div>
    </section>
  )
}
