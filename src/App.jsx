import './App.css'

function App() {
  const experience = [
    {
      title: "Senior Software Engineer",
      company: "Ernst & Young",
      period: "Dec 2024 - Present",
      highlights: [
        "AWS cloud migrations & data pipelines",
        "Redis caching - 65% latency reduction",
        "CI/CD with GitHub Actions"
      ]
    },
    {
      title: "Software Engineer",
      company: "Ernst & Young",
      period: "Aug 2022 - Dec 2024",
      highlights: [
        "Spring Boot APIs for 3,000+ locations",
        "Event-driven architecture (Lambda, SNS, SQS)",
        "Mentored junior engineers"
      ]
    }
  ]

  const projects = [
    {
      title: "TCG Price Tracker",
      description: "Track trading card prices",
      tech: "Python",
      github: "https://github.com/tungcodeforfun/tcg-price-tracker"
    },
    {
      title: "Workout Tracker",
      description: "iOS fitness app",
      tech: "Swift",
      github: "https://github.com/tungcodeforfun/WorkoutTracker"
    },
    {
      title: "TungBot",
      description: "Discord automation",
      tech: "Python",
      github: "https://github.com/tungcodeforfun/TungBot"
    }
  ]

  const skills = {
    languages: ["Java", "Python", "JavaScript", "SQL"],
    cloud: ["AWS", "Lambda", "S3", "CloudFormation"],
    tools: ["Docker", "Git", "DataDog", "Redis"]
  }

  return (
    <div className="bento-container">
      {/* Header */}
      <header className="bento-header">
        <span className="logo">TN</span>
        <nav>
          <a href="mailto:tungnguyen1651@gmail.com">Email</a>
          <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://linkedin.com/in/tungcodeforfun" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>
      </header>

      {/* Bento Grid */}
      <main className="bento-grid">
        {/* Hero Card - Large */}
        <div className="bento-card hero-card">
          <div className="hero-content">
            <img
              src="https://avatars.githubusercontent.com/u/36649688?v=4"
              alt="Tung Nguyen"
              className="avatar"
            />
            <div className="hero-text">
              <h1>Tung Nguyen</h1>
              <p className="title">Senior Software Engineer</p>
              <p className="location">New York, NY</p>
            </div>
          </div>
          <p className="hero-bio">
            3+ years building scalable cloud solutions at EY.
            Specializing in Java, Python, and AWS with a track record
            of improving system performance by 70%.
          </p>
        </div>

        {/* Stats Card */}
        <div className="bento-card stats-card">
          <div className="stat">
            <span className="stat-number">3+</span>
            <span className="stat-label">Years Experience</span>
          </div>
          <div className="stat">
            <span className="stat-number">70%</span>
            <span className="stat-label">Performance Boost</span>
          </div>
          <div className="stat">
            <span className="stat-number">3K+</span>
            <span className="stat-label">Locations Served</span>
          </div>
        </div>

        {/* Education Card */}
        <div className="bento-card education-card">
          <span className="card-label">Education</span>
          <h3>Virginia Tech</h3>
          <p>B.S. Computer Science</p>
          <p className="subtle">Class of 2022 · Dean's List</p>
        </div>

        {/* Current Role Card */}
        <div className="bento-card role-card">
          <span className="card-label">Currently</span>
          <div className="role-header">
            <div className="company-logo">EY</div>
            <div>
              <h3>Senior Software Engineer</h3>
              <p>Ernst & Young</p>
            </div>
          </div>
          <ul className="role-highlights">
            {experience[0].highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>

        {/* Skills Card */}
        <div className="bento-card skills-card">
          <span className="card-label">Skills</span>
          <div className="skills-section">
            <div className="skill-group">
              <span className="skill-category">Languages</span>
              <div className="skill-tags">
                {skills.languages.map((s, i) => <span key={i} className="tag">{s}</span>)}
              </div>
            </div>
            <div className="skill-group">
              <span className="skill-category">Cloud</span>
              <div className="skill-tags">
                {skills.cloud.map((s, i) => <span key={i} className="tag tag-cloud">{s}</span>)}
              </div>
            </div>
            <div className="skill-group">
              <span className="skill-category">Tools</span>
              <div className="skill-tags">
                {skills.tools.map((s, i) => <span key={i} className="tag tag-tools">{s}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Projects Card */}
        <div className="bento-card projects-card">
          <span className="card-label">Side Projects</span>
          <div className="projects-list">
            {projects.map((project, i) => (
              <a
                key={i}
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="project-item"
              >
                <div className="project-info">
                  <h4>{project.title}</h4>
                  <p>{project.description}</p>
                </div>
                <span className="project-tech">{project.tech}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Experience Timeline Card */}
        <div className="bento-card timeline-card">
          <span className="card-label">Experience</span>
          <div className="timeline">
            {experience.map((job, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-period">{job.period}</span>
                  <h4>{job.title}</h4>
                  <p>{job.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Card */}
        <div className="bento-card contact-card">
          <span className="card-label">Let's Connect</span>
          <p>Open to new opportunities and collaborations</p>
          <a href="mailto:tungnguyen1651@gmail.com" className="contact-btn">
            Get in Touch
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        {/* Quote Card */}
        <div className="bento-card quote-card">
          <blockquote>
            "Championing AI integration across development workflows"
          </blockquote>
          <p className="quote-context">Introduced GitHub Copilot & LLM tools at EY</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bento-footer">
        <p>&copy; {new Date().getFullYear()} Tung Nguyen</p>
      </footer>
    </div>
  )
}

export default App
