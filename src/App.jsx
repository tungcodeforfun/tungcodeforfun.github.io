import './App.css'

function App() {
  const projects = [
    {
      title: "TCG Price Tracker",
      description: "A Python application for tracking trading card game prices. Monitor price changes and get insights on your card collection value.",
      tech: ["Python"],
      github: "https://github.com/tungcodeforfun/tcg-price-tracker",
      live: null
    },
    {
      title: "Workout Tracker",
      description: "An iOS app built with Swift to track and manage workout routines. Log exercises, monitor progress, and stay on top of your fitness goals.",
      tech: ["Swift", "iOS"],
      github: "https://github.com/tungcodeforfun/WorkoutTracker",
      live: null
    },
    {
      title: "TungBot",
      description: "A custom Discord bot built with Python. Features various commands and automation for Discord server management and fun interactions.",
      tech: ["Python", "Discord API"],
      github: "https://github.com/tungcodeforfun/TungBot",
      live: null
    }
  ]

  const skills = [
    "Python", "Swift", "JavaScript", "React",
    "iOS Development", "Discord Bots", "Git", "REST APIs"
  ]

  return (
    <div className="portfolio">
      {/* Stars background */}
      <div className="stars"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <a href="#" className="nav-logo">Tung</a>
          <div className="nav-links">
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-avatar">
            <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="Tung Nguyen" />
          </div>
          <h1>Hi, I'm <span className="highlight">Tung Nguyen</span></h1>
          <p className="hero-subtitle">Software Developer</p>
          <p className="hero-description">
            Building things for the web and beyond. From Discord bots to iOS apps,
            I love turning ideas into reality through code.
          </p>
          <div className="hero-buttons">
            <a href="#projects" className="btn btn-primary">
              <span className="btn-glow"></span>
              View My Work
            </a>
            <a href="#contact" className="btn btn-secondary">Get In Touch</a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="section-content">
          <h2><span className="section-icon">&#9733;</span> About Me</h2>
          <div className="about-grid">
            <div className="about-text">
              <p>
                Hello! I'm Tung Nguyen, a software developer passionate about building
                applications across different platforms. From mobile apps to automation bots,
                I enjoy the challenge of solving problems through code.
              </p>
              <p>
                I started my coding journey in 2018 and have been exploring various technologies
                ever since. Whether it's tracking TCG card prices, building workout apps, or
                creating Discord bots, I'm always working on something new.
              </p>
              <p>Technologies I work with:</p>
              <div className="skills-grid">
                {skills.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="projects">
        <div className="section-content">
          <h2><span className="section-icon">&#9790;</span> Projects</h2>
          <div className="projects-grid">
            {projects.map((project, index) => (
              <div key={index} className="project-card">
                <div className="project-card-glow"></div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="project-tech">
                  {project.tech.map((tech, i) => (
                    <span key={i} className="tech-tag">{tech}</span>
                  ))}
                </div>
                <div className="project-links">
                  <a href={project.github} target="_blank" rel="noopener noreferrer">
                    View on GitHub
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="section-content">
          <h2><span className="section-icon">&#9993;</span> Get In Touch</h2>
          <p>
            I'm always open to new opportunities and collaborations.
            Feel free to reach out if you'd like to connect!
          </p>
          <div className="contact-links">
            <a href="mailto:tungnguyen1651@gmail.com" className="btn btn-primary">
              <span className="btn-glow"></span>
              Say Hello
            </a>
            <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with React + Vite</p>
        <p>&copy; {new Date().getFullYear()} Tung Nguyen. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
