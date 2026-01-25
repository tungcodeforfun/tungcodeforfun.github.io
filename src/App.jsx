import './App.css'
import { useState } from 'react'

function App() {
  const [activeWindow, setActiveWindow] = useState('about')

  const skills = ["Java", "Python", "JavaScript", "AWS", "Spring Boot", "React", "Docker", "SQL", "Git", "Redis", "PostgreSQL", "DataDog"]

  const experience = [
    {
      title: "Senior Software Engineer",
      company: "Ernst & Young",
      period: "Dec 2024 - Present",
      desc: "AWS migrations, Redis caching (65% latency reduction), CI/CD pipelines"
    },
    {
      title: "Software Engineer",
      company: "Ernst & Young",
      period: "Aug 2022 - Dec 2024",
      desc: "Spring Boot APIs for 3,000+ locations, event-driven architecture"
    }
  ]

  const projects = [
    { name: "TCG Price Tracker", tech: "Python", url: "https://github.com/tungcodeforfun/tcg-price-tracker" },
    { name: "Workout Tracker", tech: "Swift", url: "https://github.com/tungcodeforfun/WorkoutTracker" },
    { name: "TungBot", tech: "Python", url: "https://github.com/tungcodeforfun/TungBot" }
  ]

  const dockItems = [
    { id: 'about', icon: '👤', label: 'About' },
    { id: 'experience', icon: '💼', label: 'Experience' },
    { id: 'projects', icon: '📁', label: 'Projects' },
    { id: 'contact', icon: '✉️', label: 'Contact' }
  ]

  return (
    <div className="macos-desktop">
      {/* Menu Bar */}
      <div className="menu-bar">
        <div className="menu-left">
          <span className="apple-logo"></span>
          <span className="menu-item active">Tung Nguyen</span>
          <span className="menu-item">File</span>
          <span className="menu-item">Edit</span>
          <span className="menu-item">View</span>
        </div>
        <div className="menu-right">
          <span className="menu-item">New York, NY</span>
          <span className="menu-item">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className="menu-item">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Windows Container */}
      <div className="windows-container">
        {/* About Window */}
        <div className={`macos-window ${activeWindow === 'about' ? 'active' : ''}`} onClick={() => setActiveWindow('about')}>
          <div className="window-header">
            <div className="traffic-lights">
              <span className="light red"></span>
              <span className="light yellow"></span>
              <span className="light green"></span>
            </div>
            <span className="window-title">About Me</span>
          </div>
          <div className="window-content about-window">
            <div className="about-header">
              <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="avatar" className="about-avatar" />
              <div className="about-info">
                <h1>Tung Nguyen</h1>
                <p className="about-title">Senior Software Engineer</p>
                <p className="about-company">Ernst & Young · New York, NY</p>
              </div>
            </div>
            <div className="about-bio">
              <p>3+ years building scalable cloud solutions. Specializing in Java, Python, and AWS infrastructure with a track record of improving system performance by 70%.</p>
            </div>
            <div className="about-education">
              <h3>Education</h3>
              <p><strong>Virginia Tech</strong></p>
              <p>B.S. Computer Science, 2022</p>
              <p className="subtle">Dean's List · Beyond Boundaries Scholar</p>
            </div>
            <div className="about-skills">
              <h3>Skills</h3>
              <div className="skills-tags">
                {skills.map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Experience Window */}
        <div className={`macos-window window-offset-1 ${activeWindow === 'experience' ? 'active' : ''}`} onClick={() => setActiveWindow('experience')}>
          <div className="window-header">
            <div className="traffic-lights">
              <span className="light red"></span>
              <span className="light yellow"></span>
              <span className="light green"></span>
            </div>
            <span className="window-title">Experience</span>
          </div>
          <div className="window-content">
            <div className="experience-list">
              {experience.map((job, i) => (
                <div key={i} className="experience-item">
                  <div className="exp-header">
                    <h3>{job.title}</h3>
                    <span className="exp-period">{job.period}</span>
                  </div>
                  <p className="exp-company">{job.company}</p>
                  <p className="exp-desc">{job.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Projects Window */}
        <div className={`macos-window window-offset-2 ${activeWindow === 'projects' ? 'active' : ''}`} onClick={() => setActiveWindow('projects')}>
          <div className="window-header">
            <div className="traffic-lights">
              <span className="light red"></span>
              <span className="light yellow"></span>
              <span className="light green"></span>
            </div>
            <span className="window-title">Projects</span>
          </div>
          <div className="window-content">
            <div className="finder-list">
              {projects.map((proj, i) => (
                <a key={i} href={proj.url} target="_blank" rel="noopener noreferrer" className="finder-item">
                  <span className="finder-icon">📄</span>
                  <div className="finder-info">
                    <span className="finder-name">{proj.name}</span>
                    <span className="finder-tech">{proj.tech}</span>
                  </div>
                  <span className="finder-arrow">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Window */}
        <div className={`macos-window window-offset-3 ${activeWindow === 'contact' ? 'active' : ''}`} onClick={() => setActiveWindow('contact')}>
          <div className="window-header">
            <div className="traffic-lights">
              <span className="light red"></span>
              <span className="light yellow"></span>
              <span className="light green"></span>
            </div>
            <span className="window-title">Contact</span>
          </div>
          <div className="window-content contact-window">
            <h2>Let's Connect</h2>
            <p>Open to new opportunities and collaborations</p>
            <div className="contact-links">
              <a href="mailto:tungnguyen1651@gmail.com" className="contact-btn">
                <span className="btn-icon">✉️</span>
                <span>tungnguyen1651@gmail.com</span>
              </a>
              <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contact-btn">
                <span className="btn-icon">💻</span>
                <span>github.com/tungcodeforfun</span>
              </a>
              <a href="https://linkedin.com/in/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contact-btn">
                <span className="btn-icon">💼</span>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dock */}
      <div className="dock">
        <div className="dock-container">
          {dockItems.map((item) => (
            <button
              key={item.id}
              className={`dock-item ${activeWindow === item.id ? 'active' : ''}`}
              onClick={() => setActiveWindow(item.id)}
            >
              <span className="dock-icon">{item.icon}</span>
              <span className="dock-label">{item.label}</span>
              {activeWindow === item.id && <span className="dock-indicator"></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
