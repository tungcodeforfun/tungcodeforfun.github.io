import { navigation, profile } from './content'
import { Contact } from './sections/Contact'
import { Contract } from './sections/Contract'
import { Experience } from './sections/Experience'
import { Hero } from './sections/Hero'
import { Pullfolio } from './sections/Pullfolio'
import { Systems } from './sections/Systems'

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
        <nav className="topbar__nav" aria-label="Sections">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="topbar__controls">
          <button type="button" className="toggle" data-toggle="motion" hidden>
            Pause motion
          </button>
          <button type="button" className="toggle" data-toggle="theme" hidden>
            Dark
          </button>
        </div>
      </header>
      <main id="main" className="page" tabIndex={-1}>
        <Hero />
        <Systems />
        <Pullfolio />
        <Experience />
        <Contract />
        <Contact />
      </main>
      <footer className="footer">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <a href={profile.source}>Source</a>
      </footer>
    </>
  )
}
