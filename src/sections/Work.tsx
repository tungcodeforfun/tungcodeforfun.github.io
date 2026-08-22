import { focus } from '../content'

export function Work() {
  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <header className="section__head">
        <span className="section__index">01</span>
        <h2 id="work-title" className="section__title">
          What I <em>work on</em>
        </h2>
      </header>
      <ol className="focus-grid">
        {focus.map((item, index) => (
          <li key={item.title} className="focus">
            <span className="focus__num">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="focus__title">{item.title}</h3>
            <p className="focus__body">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
