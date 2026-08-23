import { focus } from '../content'

export function Work() {
  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <header className="section__head">
        <h2 id="work-title" className="section__title">
          What I work on
        </h2>
        <span className="section__meta">{focus.length} areas</span>
      </header>
      <ul className="focus-grid">
        {focus.map((item) => (
          <li key={item.title} className="focus">
            <h3 className="focus__title">{item.title}</h3>
            <p className="focus__body">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
