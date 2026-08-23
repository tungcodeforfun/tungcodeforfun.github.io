import { LiveBackground } from './background/LiveBackground'
import { navigation, profile } from './content'
import { Contact } from './sections/Contact'
import { Experience } from './sections/Experience'
import { Freelance } from './sections/Freelance'
import { Hero } from './sections/Hero'
import { Projects } from './sections/Projects'
import { Work } from './sections/Work'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <LiveBackground />
      <div className="scrim" aria-hidden="true" />
      <header className="topbar">
        <a className="topbar__name" href="#top">
          {profile.name}
        </a>
        <nav className="topbar__nav" aria-label="Sections">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="topbar__external">
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main" className="page">
        <Hero />
        <Work />
        <Freelance />
        <Experience />
        <Projects />
        <Contact />
      </main>
      <footer className="footer">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>
          Shaders adapted from{' '}
          <a href="https://github.com/MengTo/threeui" target="_blank" rel="noopener noreferrer">
            ThreeUI
          </a>{' '}
          (MIT)
        </span>
      </footer>
    </>
  )
}
