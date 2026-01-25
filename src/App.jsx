import './App.css'

function App() {
  const experience = [
    {
      title: "Senior Software Engineer (Consultant)",
      company: "Ernst & Young (EY)",
      location: "New York, NY",
      period: "Dec 2024 - Present",
      highlights: [
        "Owned end-to-end migration of 5+ features from on-premise legacy systems to AWS, designing data pipelines and secure transfer protocols",
        "Optimized database queries and introduced Redis caching layer, reducing API latency by ~65%",
        "Engineered CI/CD pipelines using GitHub Actions and CloudFormation, cutting deployment times by ~30% across 12+ microservices",
        "Led on-call rotations and production incident triage with improved observability using DataDog"
      ]
    },
    {
      title: "Software Engineer / Staff Technology Consultant",
      company: "Ernst & Young (EY)",
      location: "New York, NY",
      period: "Aug 2022 - Dec 2024",
      highlights: [
        "Developed Java (Spring Boot) APIs and PostgreSQL data layer for enterprise restaurant platform serving 3,000+ locations",
        "Architected event-driven messaging system using AWS Lambda, SNS, and SQS for asynchronous order and inventory updates",
        "Implemented Protobuf for service-to-service communication, reducing payload sizes by ~40%",
        "Built integration test framework using JUnit and Testcontainers, achieving ~80% test coverage",
        "Mentored junior engineers on microservices patterns and code review standards"
      ]
    }
  ]

  const projects = [
    {
      title: "TCG Price Tracker",
      description: "A Python application for tracking trading card game prices. Monitor price changes and get insights on your card collection value.",
      tech: ["Python"],
      github: "https://github.com/tungcodeforfun/tcg-price-tracker"
    },
    {
      title: "Workout Tracker",
      description: "An iOS app built with Swift to track and manage workout routines. Log exercises, monitor progress, and stay on top of your fitness goals.",
      tech: ["Swift", "iOS"],
      github: "https://github.com/tungcodeforfun/WorkoutTracker"
    },
    {
      title: "TungBot",
      description: "A custom Discord bot built with Python. Features various commands and automation for Discord server management.",
      tech: ["Python", "Discord API"],
      github: "https://github.com/tungcodeforfun/TungBot"
    }
  ]

  const skills = {
    languages: ["Java", "Python", "JavaScript", "C", "SQL"],
    frameworks: ["Spring Boot", "React", "React Native"],
    cloud: ["AWS Lambda", "SNS", "SQS", "S3", "CloudFormation"],
    tools: ["Docker", "Git", "DataDog", "Postman", "JIRA"],
    databases: ["PostgreSQL", "DynamoDB", "Redis"]
  }

  return (
    <div className="portfolio">
      {/* Stars background */}
      <div className="stars"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <a href="#" className="nav-logo">TN</a>
          <div className="nav-links">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
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
          <h1>Tung Nguyen</h1>
          <p className="hero-subtitle">Senior Software Engineer</p>
          <p className="hero-location">New York, NY</p>
          <p className="hero-description">
            3+ years building scalable cloud solutions at Ernst & Young.
            Specializing in Java, Python, and AWS infrastructure with a track record
            of improving system performance by 70%.
          </p>
          <div className="hero-buttons">
            <a href="#experience" className="btn btn-primary">
              <span className="btn-glow"></span>
              View Experience
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
                I'm a Senior Software Engineer at Ernst & Young, where I build and optimize
                enterprise-scale applications. My expertise spans cloud migrations, API architecture,
                and leading development teams to deliver high-performance solutions.
              </p>
              <p>
                I'm passionate about championing AI integration in development workflows, having
                introduced GitHub Copilot and LLM-based tools to accelerate code reviews and
                documentation across teams.
              </p>

              <div className="education-card">
                <h3>Education</h3>
                <p className="school">Virginia Tech</p>
                <p className="degree">B.S. Computer Science | 2022</p>
                <p className="honors">Dean's List (2020, 2021, 2022) | Beyond Boundaries Scholarship</p>
              </div>

              <h3 className="skills-title">Technical Skills</h3>
              <div className="skills-categories">
                <div className="skill-category">
                  <span className="category-label">Languages</span>
                  <div className="skills-grid">
                    {skills.languages.map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="skill-category">
                  <span className="category-label">Frameworks</span>
                  <div className="skills-grid">
                    {skills.frameworks.map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="skill-category">
                  <span className="category-label">Cloud & AWS</span>
                  <div className="skills-grid">
                    {skills.cloud.map((skill, i) => (
                      <span key={i} className="skill-tag skill-cloud">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="skill-category">
                  <span className="category-label">Databases</span>
                  <div className="skills-grid">
                    {skills.databases.map((skill, i) => (
                      <span key={i} className="skill-tag skill-db">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="skill-category">
                  <span className="category-label">Tools</span>
                  <div className="skills-grid">
                    {skills.tools.map((skill, i) => (
                      <span key={i} className="skill-tag skill-tool">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="experience">
        <div className="section-content">
          <h2><span className="section-icon">&#9883;</span> Experience</h2>
          <div className="experience-timeline">
            {experience.map((job, index) => (
              <div key={index} className="experience-card">
                <div className="experience-header">
                  <div>
                    <h3>{job.title}</h3>
                    <p className="company">{job.company}</p>
                  </div>
                  <div className="experience-meta">
                    <span className="period">{job.period}</span>
                    <span className="location">{job.location}</span>
                  </div>
                </div>
                <ul className="experience-highlights">
                  {job.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="projects">
        <div className="section-content">
          <h2><span className="section-icon">&#9790;</span> Side Projects</h2>
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
            I'm always open to discussing new opportunities, interesting projects,
            or ways to collaborate. Feel free to reach out!
          </p>
          <div className="contact-links">
            <a href="mailto:tungnguyen1651@gmail.com" className="btn btn-primary">
              <span className="btn-glow"></span>
              Say Hello
            </a>
            <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              GitHub
            </a>
            <a href="https://linkedin.com/in/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Tung Nguyen. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
