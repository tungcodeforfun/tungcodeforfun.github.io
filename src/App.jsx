import './App.css'

function App() {
  const projects = [
    {
      title: "Project One",
      description: "A brief description of your first project. What technologies did you use? What problem does it solve?",
      tech: ["React", "Node.js", "MongoDB"],
      github: "https://github.com/tungcodeforfun/project-one",
      live: "#"
    },
    {
      title: "Project Two",
      description: "Description of another cool project you've built. Highlight the key features and your role.",
      tech: ["Python", "FastAPI", "PostgreSQL"],
      github: "https://github.com/tungcodeforfun/project-two",
      live: "#"
    },
    {
      title: "Project Three",
      description: "Yet another impressive project. Show off your diverse skill set and creativity.",
      tech: ["TypeScript", "Next.js", "Tailwind"],
      github: "https://github.com/tungcodeforfun/project-three",
      live: "#"
    }
  ]

  const skills = [
    "JavaScript", "TypeScript", "React", "Node.js",
    "Python", "Git", "SQL", "REST APIs"
  ]

  return (
    <div className="portfolio">
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
          <h1>Hi, I'm <span className="highlight">Tung</span></h1>
          <p className="hero-subtitle">Software Developer</p>
          <p className="hero-description">
            I build things for the web. Passionate about creating elegant solutions
            to complex problems.
          </p>
          <div className="hero-buttons">
            <a href="#projects" className="btn btn-primary">View My Work</a>
            <a href="#contact" className="btn btn-secondary">Get In Touch</a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="section-content">
          <h2>About Me</h2>
          <div className="about-grid">
            <div className="about-text">
              <p>
                Hello! I'm Tung, a software developer who loves building things that live on the internet.
                I enjoy creating solutions that are not only functional but also provide great user experiences.
              </p>
              <p>
                My interest in development started when I first discovered the power of turning ideas into
                reality through code. Since then, I've been constantly learning and improving my skills.
              </p>
              <p>Here are some technologies I've been working with:</p>
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
          <h2>Projects</h2>
          <div className="projects-grid">
            {projects.map((project, index) => (
              <div key={index} className="project-card">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="project-tech">
                  {project.tech.map((tech, i) => (
                    <span key={i} className="tech-tag">{tech}</span>
                  ))}
                </div>
                <div className="project-links">
                  <a href={project.github} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                  {project.live !== "#" && (
                    <a href={project.live} target="_blank" rel="noopener noreferrer">
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="section-content">
          <h2>Get In Touch</h2>
          <p>
            I'm currently open to new opportunities and collaborations.
            Whether you have a question or just want to say hi, feel free to reach out!
          </p>
          <div className="contact-links">
            <a href="mailto:your.email@example.com" className="btn btn-primary">
              Say Hello
            </a>
            <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              GitHub
            </a>
            <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with React + Vite</p>
        <p>&copy; {new Date().getFullYear()} Tung. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
