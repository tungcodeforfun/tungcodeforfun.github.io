import './App.css'
import { useState, useRef, useCallback } from 'react'

function App() {
  const [activeWindow, setActiveWindow] = useState('about')
  const [windowPositions, setWindowPositions] = useState({
    about: { x: 50, y: 60 },
    experience: { x: 150, y: 80 },
    projects: { x: 250, y: 100 },
    contact: { x: 350, y: 120 }
  })
  const [windowOrder, setWindowOrder] = useState(['about', 'experience', 'projects', 'contact'])
  const dragRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const bringToFront = (id) => {
    setWindowOrder(prev => [...prev.filter(w => w !== id), id])
    setActiveWindow(id)
  }

  const handleMouseDown = (e, windowId) => {
    if (e.target.closest('.window-content')) return
    e.preventDefault()
    dragRef.current = windowId
    const pos = windowPositions[windowId]
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    }
    bringToFront(windowId)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return
    setWindowPositions(prev => ({
      ...prev,
      [dragRef.current]: {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      }
    }))
  }, [])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

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

  const DockIcon = ({ type }) => {
    const icons = {
      about: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
        </svg>
      ),
      experience: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      ),
      projects: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7c0-1.1.9-2 2-2h4l2 2h8c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"/>
        </svg>
      ),
      contact: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M22 6l-10 7L2 6"/>
        </svg>
      )
    }
    return icons[type]
  }

  const dockItems = [
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' }
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
        <div
          className={`macos-window ${activeWindow === 'about' ? 'active' : ''}`}
          style={{
            left: windowPositions.about.x,
            top: windowPositions.about.y,
            zIndex: windowOrder.indexOf('about')
          }}
          onMouseDown={(e) => handleMouseDown(e, 'about')}
        >
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
        <div
          className={`macos-window ${activeWindow === 'experience' ? 'active' : ''}`}
          style={{
            left: windowPositions.experience.x,
            top: windowPositions.experience.y,
            zIndex: windowOrder.indexOf('experience')
          }}
          onMouseDown={(e) => handleMouseDown(e, 'experience')}
        >
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
        <div
          className={`macos-window ${activeWindow === 'projects' ? 'active' : ''}`}
          style={{
            left: windowPositions.projects.x,
            top: windowPositions.projects.y,
            zIndex: windowOrder.indexOf('projects')
          }}
          onMouseDown={(e) => handleMouseDown(e, 'projects')}
        >
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
        <div
          className={`macos-window ${activeWindow === 'contact' ? 'active' : ''}`}
          style={{
            left: windowPositions.contact.x,
            top: windowPositions.contact.y,
            zIndex: windowOrder.indexOf('contact')
          }}
          onMouseDown={(e) => handleMouseDown(e, 'contact')}
        >
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
              onClick={() => bringToFront(item.id)}
            >
              <span className="dock-icon"><DockIcon type={item.id} /></span>
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
