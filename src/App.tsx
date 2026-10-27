import { navigation, profile } from './content'
import { Contact } from './sections/Contact'
import { Contract } from './sections/Contract'
import { Experience } from './sections/Experience'
import { Hero } from './sections/Hero'
import { Pullfolio } from './sections/Pullfolio'
import { Work } from './sections/Work'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a className="topbar__name" href="#top">
          {profile.name}
        </a>
        <nav aria-label="Sections">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="controls">
          <button type="button" className="control" data-toggle="motion" hidden>
            Pause motion
          </button>
          <button type="button" className="control" data-toggle="theme" hidden>
            Dark
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Hero />
        <Work />
        <Pullfolio />
        <Experience />
        <Contract />
        <Contact />
      </main>
      <footer className="footer">
        © {new Date().getFullYear()} {profile.name}.
      </footer>
    </>
  )
}
