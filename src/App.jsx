import './App.css'
import { useState, useRef, useEffect } from 'react'

function App() {
  const [activeWindow, setActiveWindow] = useState('about')
  const [windowStates, setWindowStates] = useState({
    about: { open: true, minimized: false, maximized: false },
    experience: { open: true, minimized: false, maximized: false },
    projects: { open: true, minimized: false, maximized: false },
    contact: { open: true, minimized: false, maximized: false }
  })
  const [windowOrder, setWindowOrder] = useState(['about', 'experience', 'projects', 'contact'])
  const [, forceUpdate] = useState(0)
  const [expandedItems, setExpandedItems] = useState({})
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Calculate initial positions based on viewport - spread out more
  const getInitialPositions = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuBarHeight = 28
    const dockHeight = 80

    if (vw >= 1200) {
      // Large desktop: spread across screen
      return {
        about: { x: 40, y: 50 },
        experience: { x: vw - 480, y: 50 },
        projects: { x: 120, y: vh - 380 },
        contact: { x: vw - 520, y: vh - 400 }
      }
    } else if (vw >= 1024) {
      // Desktop: 2x2 with more spacing
      const gapX = 60
      const startX = 40
      const startY = menuBarHeight + 30
      return {
        about: { x: startX, y: startY },
        experience: { x: vw - 460, y: startY + 40 },
        projects: { x: startX + 80, y: startY + 320 },
        contact: { x: vw - 480, y: startY + 360 }
      }
    } else if (vw >= 768) {
      // Tablet: staggered cascade with more spread
      const startY = menuBarHeight + 30
      return {
        about: { x: 30, y: startY },
        experience: { x: vw - 450, y: startY + 60 },
        projects: { x: 60, y: startY + 200 },
        contact: { x: vw - 420, y: startY + 260 }
      }
    }
    return {
      about: { x: 20, y: 50 },
      experience: { x: 20, y: 50 },
      projects: { x: 20, y: 50 },
      contact: { x: 20, y: 50 }
    }
  }

  // Use refs for positions and sizes to avoid re-renders during drag/resize
  const windowPositions = useRef(getInitialPositions())
  const windowSizes = useRef({
    about: { w: 420, h: 450 },
    experience: { w: 420, h: 280 },
    projects: { w: 420, h: 280 },
    contact: { w: 420, h: 300 }
  })

  // Handle resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const windowRefs = useRef({})
  const dragState = useRef(null)
  const resizeState = useRef(null)

  const bringToFront = (id) => {
    setWindowOrder(prev => [...prev.filter(w => w !== id), id])
    setActiveWindow(id)
    if (windowStates[id].minimized) {
      setWindowStates(prev => ({
        ...prev,
        [id]: { ...prev[id], minimized: false, open: true }
      }))
    }
  }

  const closeWindow = (e, id) => {
    e.stopPropagation()
    setWindowStates(prev => ({
      ...prev,
      [id]: { ...prev[id], open: false }
    }))
  }

  const minimizeWindow = (e, id) => {
    e.stopPropagation()
    setWindowStates(prev => ({
      ...prev,
      [id]: { ...prev[id], minimized: true }
    }))
  }

  const maximizeWindow = (e, id) => {
    e.stopPropagation()
    setWindowStates(prev => ({
      ...prev,
      [id]: { ...prev[id], maximized: !prev[id].maximized }
    }))
  }

  const openWindow = (id) => {
    setWindowStates(prev => ({
      ...prev,
      [id]: { open: true, minimized: false, maximized: false }
    }))
    bringToFront(id)
  }

  // Drag handlers using direct DOM manipulation for performance
  const handleDragStart = (e, windowId) => {
    if (e.target.closest('.window-content') || e.target.closest('.traffic-lights') || e.target.closest('.resize-handle')) return
    e.preventDefault()

    const pos = windowPositions.current[windowId]
    dragState.current = {
      id: windowId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y
    }

    bringToFront(windowId)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = (e) => {
    if (!dragState.current) return
    const { id, startX, startY, origX, origY } = dragState.current
    const newX = origX + (e.clientX - startX)
    const newY = origY + (e.clientY - startY)

    windowPositions.current[id] = { x: newX, y: newY }

    // Direct DOM update for smooth dragging
    const el = windowRefs.current[id]
    if (el) {
      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }
  }

  const handleDragEnd = () => {
    dragState.current = null
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  // Resize handlers
  const handleResizeStart = (e, windowId, direction) => {
    e.preventDefault()
    e.stopPropagation()

    const size = windowSizes.current[windowId]
    const pos = windowPositions.current[windowId]

    resizeState.current = {
      id: windowId,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      origW: size.w,
      origH: size.h,
      origX: pos.x,
      origY: pos.y
    }

    bringToFront(windowId)
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

  const handleResizeMove = (e) => {
    if (!resizeState.current) return
    const { id, direction, startX, startY, origW, origH, origX, origY } = resizeState.current

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    let newW = origW
    let newH = origH
    let newX = origX
    let newY = origY

    // Handle different resize directions
    if (direction.includes('e')) newW = Math.max(300, origW + deltaX)
    if (direction.includes('w')) {
      newW = Math.max(300, origW - deltaX)
      newX = origX + (origW - newW)
    }
    if (direction.includes('s')) newH = Math.max(200, origH + deltaY)
    if (direction.includes('n')) {
      newH = Math.max(200, origH - deltaY)
      newY = origY + (origH - newH)
    }

    windowSizes.current[id] = { w: newW, h: newH }
    windowPositions.current[id] = { x: newX, y: newY }

    // Direct DOM update for smooth resizing
    const el = windowRefs.current[id]
    if (el) {
      el.style.width = `${newW}px`
      el.style.height = `${newH}px`
      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }
  }

  const handleResizeEnd = () => {
    resizeState.current = null
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
    forceUpdate(n => n + 1) // Sync state after resize
  }

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const skills = ["Java", "Python", "JavaScript", "AWS", "Spring Boot", "React", "Docker", "SQL", "Git", "Redis", "PostgreSQL", "DataDog"]

  const experience = [
    {
      id: 'exp1',
      title: "Senior Software Engineer",
      company: "Ernst & Young",
      period: "Dec 2024 - Present",
      desc: "AWS migrations, Redis caching (65% latency reduction), CI/CD pipelines",
      details: [
        "Led migration of legacy systems to AWS, reducing infrastructure costs by 40%",
        "Implemented Redis caching layer achieving 65% reduction in API latency",
        "Designed and deployed CI/CD pipelines using GitHub Actions and AWS CodePipeline",
        "Mentored junior developers and conducted code reviews for team of 5"
      ],
      skills: ["AWS", "Redis", "Docker", "Terraform", "GitHub Actions"]
    },
    {
      id: 'exp2',
      title: "Software Engineer",
      company: "Ernst & Young",
      period: "Aug 2022 - Dec 2024",
      desc: "Spring Boot APIs for 3,000+ locations, event-driven architecture",
      details: [
        "Built RESTful APIs serving 3,000+ retail locations with 99.9% uptime",
        "Designed event-driven architecture using Apache Kafka for real-time data processing",
        "Optimized PostgreSQL queries reducing response times by 70%",
        "Implemented DataDog monitoring and alerting for production systems"
      ],
      skills: ["Java", "Spring Boot", "Kafka", "PostgreSQL", "DataDog"]
    }
  ]

  const projects = [
    {
      id: 'proj1',
      name: "TCG Price Tracker",
      tech: "Python",
      url: "https://github.com/tungcodeforfun/tcg-price-tracker",
      desc: "Real-time trading card game price tracking application",
      details: [
        "Scrapes pricing data from multiple TCG marketplaces",
        "Tracks price history and alerts users of significant changes",
        "Built with Python, BeautifulSoup, and SQLite"
      ]
    },
    {
      id: 'proj2',
      name: "Workout Tracker",
      tech: "Swift",
      url: "https://github.com/tungcodeforfun/WorkoutTracker",
      desc: "iOS app for tracking workouts and fitness progress",
      details: [
        "Native iOS app built with SwiftUI",
        "Tracks exercises, sets, reps, and progress over time",
        "Integrates with HealthKit for comprehensive fitness data"
      ]
    },
    {
      id: 'proj3',
      name: "TungBot",
      tech: "Python",
      url: "https://github.com/tungcodeforfun/TungBot",
      desc: "Discord bot with various utility and fun commands",
      details: [
        "Built with discord.py library",
        "Features include music playback, moderation tools, and games",
        "Deployed on cloud infrastructure with 24/7 uptime"
      ]
    }
  ]

  const DockIcon = ({ type }) => {
    const icons = {
      about: (
        // Notes app icon - iOS 18 style
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="notesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff9c4" />
              <stop offset="100%" stopColor="#fdd835" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#notesGrad)" />
          <rect x="24" y="22" width="72" height="76" rx="6" fill="#fff" />
          <rect x="32" y="34" width="44" height="3" rx="1.5" fill="#e0a000" />
          <rect x="32" y="44" width="56" height="3" rx="1.5" fill="#e0a000" />
          <rect x="32" y="54" width="48" height="3" rx="1.5" fill="#e0a000" />
          <rect x="32" y="64" width="52" height="3" rx="1.5" fill="#e0a000" />
          <rect x="32" y="74" width="36" height="3" rx="1.5" fill="#e0a000" />
          <rect x="32" y="84" width="24" height="3" rx="1.5" fill="#e0a000" />
        </svg>
      ),
      experience: (
        // Messages app icon - iOS 18 style
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="messagesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5eda6a" />
              <stop offset="100%" stopColor="#25b933" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#messagesGrad)" />
          <ellipse cx="60" cy="52" rx="38" ry="32" fill="#fff" />
          <path d="M32 70 Q28 82, 22 88 Q36 84, 42 78" fill="#fff" />
        </svg>
      ),
      projects: (
        // Finder app icon - macOS Sonoma style
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="finderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6ed3ff" />
              <stop offset="100%" stopColor="#0a84ff" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#finderGrad)" />
          <rect x="28" y="24" width="64" height="72" rx="8" fill="#fff" />
          <ellipse cx="46" cy="50" rx="8" ry="9" fill="#0a84ff" />
          <ellipse cx="74" cy="50" rx="8" ry="9" fill="#0a84ff" />
          <path d="M42 72 Q60 86 78 72" stroke="#0a84ff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="28" y="24" width="64" height="6" rx="3" fill="#e8e8e8" />
        </svg>
      ),
      contact: (
        // Contacts app icon - iOS 18 style
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="contactsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a8a8" />
              <stop offset="100%" stopColor="#787878" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" rx="26" fill="url(#contactsGrad)" />
          <rect x="28" y="18" width="68" height="84" rx="6" fill="#fff" />
          <circle cx="62" cy="46" r="16" fill="#d0d0d0" />
          <ellipse cx="62" cy="82" rx="24" ry="14" fill="#d0d0d0" />
          <rect x="20" y="32" width="10" height="10" rx="2" fill="#ff3b30" />
          <rect x="20" y="48" width="10" height="10" rx="2" fill="#ff9500" />
          <rect x="20" y="64" width="10" height="10" rx="2" fill="#34c759" />
          <rect x="20" y="80" width="10" height="10" rx="2" fill="#007aff" />
        </svg>
      )
    }
    return icons[type]
  }

  const dockItems = [
    { id: 'about', label: 'Notes' },
    { id: 'experience', label: 'Messages' },
    { id: 'projects', label: 'Finder' },
    { id: 'contact', label: 'Contacts' }
  ]

  const windowThemes = {
    about: 'notes-theme',
    experience: 'messages-theme',
    projects: 'finder-theme',
    contact: 'contacts-theme'
  }

  const renderWindow = (id, title, content) => {
    const state = windowStates[id]
    if (!state.open || state.minimized) return null

    const pos = windowPositions.current[id]
    const size = windowSizes.current[id]
    const isMessages = id === 'experience'

    return (
      <div
        key={id}
        ref={el => windowRefs.current[id] = el}
        className={`macos-window ${windowThemes[id]} ${activeWindow === id ? 'active' : ''} ${state.maximized ? 'maximized' : ''}`}
        style={state.maximized ? {} : {
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          zIndex: windowOrder.indexOf(id)
        }}
        onMouseDown={(e) => handleDragStart(e, id)}
      >
        {isMessages ? (
          <div className="window-header messages-header">
            <button className="messages-back-btn" onClick={(e) => closeWindow(e, id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="messages-contact">
              <div className="messages-avatar">
                <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="avatar" />
              </div>
              <span className="messages-name">Tung Nguyen</span>
            </div>
            <button className="messages-video-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="window-header">
            <div className="traffic-lights">
              <button className="light red" onClick={(e) => closeWindow(e, id)}>
                <svg viewBox="0 0 12 12"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#4d0000" strokeWidth="1.2" /></svg>
              </button>
              <button className="light yellow" onClick={(e) => minimizeWindow(e, id)}>
                <svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="#995700" strokeWidth="1.5" /></svg>
              </button>
              <button className="light green" onClick={(e) => maximizeWindow(e, id)}>
                <svg viewBox="0 0 12 12">
                  <path d="M2 3.5h3v-1.5M10 8.5h-3v1.5M7 2v3h3M5 10v-3h-3" stroke="#006400" strokeWidth="1" fill="none" />
                </svg>
              </button>
            </div>
            <span className="window-title">{title}</span>
          </div>
        )}
        <div className="window-content">
          {content}
        </div>
        {isMessages && (
          <div className="messages-input-bar">
            <button className="messages-plus-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
            <div className="messages-input">
              <span>iMessage</span>
            </div>
            <button className="messages-mic-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          </div>
        )}
        {/* Resize handles */}
        {!state.maximized && (
          <>
            <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, id, 'n')} />
            <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, id, 's')} />
            <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, id, 'e')} />
            <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, id, 'w')} />
            <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, id, 'ne')} />
            <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, id, 'nw')} />
            <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, id, 'se')} />
            <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, id, 'sw')} />
          </>
        )}
      </div>
    )
  }

  // Mobile content sections
  const windowContents = {
    about: (
      <div className="about-window">
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
    ),
    experience: (
      <div className="experience-list">
        {experience.map((job) => (
          <div
            key={job.id}
            className={`experience-item expandable ${expandedItems[job.id] ? 'expanded' : ''}`}
            onClick={() => toggleExpand(job.id)}
          >
            <div className="exp-header">
              <h3>{job.title}</h3>
              <span className="exp-period">{job.period}</span>
            </div>
            <p className="exp-company">{job.company}</p>
            <p className="exp-desc">{job.desc}</p>
            <span className="expand-icon">{expandedItems[job.id] ? '−' : '+'}</span>
            {expandedItems[job.id] && (
              <div className="exp-details">
                <ul>
                  {job.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
                <div className="exp-skills">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="exp-skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    ),
    projects: (
      <div className="finder-list">
        {projects.map((proj) => (
          <div key={proj.id} className={`finder-item-wrapper ${expandedItems[proj.id] ? 'expanded' : ''}`}>
            <div className="finder-item" onClick={() => toggleExpand(proj.id)}>
              <span className="finder-icon">
                <svg viewBox="0 0 32 32" fill="none">
                  <path d="M6 6h12l2 2h6a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" fill="#64b5f6" />
                  <rect x="4" y="10" width="24" height="16" rx="2" fill="#90caf9" />
                </svg>
              </span>
              <div className="finder-info">
                <span className="finder-name">{proj.name}</span>
                <span className="finder-tech">{proj.tech}</span>
              </div>
              <span className="finder-arrow">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ transform: expandedItems[proj.id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                </svg>
              </span>
            </div>
            {expandedItems[proj.id] && (
              <div className="project-details">
                <p className="project-desc">{proj.desc}</p>
                <ul>
                  {proj.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
                <a href={proj.url} target="_blank" rel="noopener noreferrer" className="project-link">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    ),
    contact: (
      <div className="contact-window">
        <h2>Let's Connect</h2>
        <p>Open to new opportunities and collaborations</p>
        <div className="contact-links">
          <a href="mailto:tungnguyen1651@gmail.com" className="contact-btn">
            <span className="btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </span>
            <span>tungnguyen1651@gmail.com</span>
          </a>
          <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contact-btn">
            <span className="btn-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </span>
            <span>github.com/tungcodeforfun</span>
          </a>
          <a href="https://linkedin.com/in/tungngvyen" target="_blank" rel="noopener noreferrer" className="contact-btn">
            <span className="btn-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </span>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>
    )
  }

  const windowTitles = {
    about: 'About Me',
    experience: 'Experience',
    projects: 'Projects',
    contact: 'Contact'
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="macos-desktop mobile">
        {/* Menu Bar */}
        <div className="menu-bar">
          <div className="menu-left">
            <span className="apple-logo">
              <svg viewBox="0 0 17 20" fill="currentColor">
                <path d="M15.5 14.7c-.3.7-.5 1-.9 1.6-.6.9-1.4 2-2.4 2-.9 0-1.1-.6-2.3-.6-1.2 0-1.5.6-2.4.6-.9 0-1.7-1-2.3-1.9C3.7 14.3 3 11.5 3 9c0-3.2 2.1-4.9 4.1-4.9 1 0 1.9.7 2.5.7.6 0 1.6-.7 2.8-.7.8 0 2.4.3 3.3 2.3-2.9 1.6-2.4 5.6.8 6.6zM11.7 2.5c.5-.6.8-1.5.7-2.5-.7.1-1.6.5-2.1 1.2-.5.5-.9 1.4-.8 2.4.8.1 1.6-.4 2.2-1.1z"/>
              </svg>
            </span>
            <span className="menu-item active">Tung Nguyen</span>
          </div>
          <div className="menu-right">
            <span className="menu-item">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="mobile-content">
          <div className={`mobile-window ${windowThemes[activeWindow]}`}>
            <div className="window-header">
              <div className="traffic-lights">
                <span className="light red"></span>
                <span className="light yellow"></span>
                <span className="light green"></span>
              </div>
              <span className="window-title">{windowTitles[activeWindow]}</span>
            </div>
            <div className="window-content">
              {windowContents[activeWindow]}
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
                <span className="dock-icon"><DockIcon type={item.id} /></span>
                {activeWindow === item.id && <span className="dock-indicator"></span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="macos-desktop">
      {/* Menu Bar */}
      <div className="menu-bar">
        <div className="menu-left">
          <span className="apple-logo">
            <svg viewBox="0 0 17 20" fill="currentColor">
              <path d="M15.5 14.7c-.3.7-.5 1-.9 1.6-.6.9-1.4 2-2.4 2-.9 0-1.1-.6-2.3-.6-1.2 0-1.5.6-2.4.6-.9 0-1.7-1-2.3-1.9C3.7 14.3 3 11.5 3 9c0-3.2 2.1-4.9 4.1-4.9 1 0 1.9.7 2.5.7.6 0 1.6-.7 2.8-.7.8 0 2.4.3 3.3 2.3-2.9 1.6-2.4 5.6.8 6.6zM11.7 2.5c.5-.6.8-1.5.7-2.5-.7.1-1.6.5-2.1 1.2-.5.5-.9 1.4-.8 2.4.8.1 1.6-.4 2.2-1.1z"/>
            </svg>
          </span>
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
        {renderWindow('about', 'About Me', (
          <div className="about-window">
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
        ))}

        {renderWindow('experience', 'Experience', (
          <div className="experience-list">
            {experience.map((job) => (
              <div
                key={job.id}
                className={`experience-item expandable ${expandedItems[job.id] ? 'expanded' : ''}`}
                onClick={() => toggleExpand(job.id)}
              >
                <div className="exp-header">
                  <h3>{job.title}</h3>
                  <span className="exp-period">{job.period}</span>
                </div>
                <p className="exp-company">{job.company}</p>
                <p className="exp-desc">{job.desc}</p>
                <span className="expand-icon">{expandedItems[job.id] ? '−' : '+'}</span>
                {expandedItems[job.id] && (
                  <div className="exp-details">
                    <ul>
                      {job.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                    <div className="exp-skills">
                      {job.skills.map((skill, i) => (
                        <span key={i} className="exp-skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {renderWindow('projects', 'Projects', (
          <div className="finder-list">
            {projects.map((proj) => (
              <div key={proj.id} className={`finder-item-wrapper ${expandedItems[proj.id] ? 'expanded' : ''}`}>
                <div className="finder-item" onClick={() => toggleExpand(proj.id)}>
                  <span className="finder-icon">
                    <svg viewBox="0 0 32 32" fill="none">
                      <path d="M6 6h12l2 2h6a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" fill="#64b5f6" />
                      <rect x="4" y="10" width="24" height="16" rx="2" fill="#90caf9" />
                    </svg>
                  </span>
                  <div className="finder-info">
                    <span className="finder-name">{proj.name}</span>
                    <span className="finder-tech">{proj.tech}</span>
                  </div>
                  <span className="finder-arrow">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ transform: expandedItems[proj.id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                  </span>
                </div>
                {expandedItems[proj.id] && (
                  <div className="project-details">
                    <p className="project-desc">{proj.desc}</p>
                    <ul>
                      {proj.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      View on GitHub
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {renderWindow('contact', 'Contact', (
          <div className="contact-window">
            <h2>Let's Connect</h2>
            <p>Open to new opportunities and collaborations</p>
            <div className="contact-links">
              <a href="mailto:tungnguyen1651@gmail.com" className="contact-btn">
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </span>
                <span>tungnguyen1651@gmail.com</span>
              </a>
              <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contact-btn">
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </span>
                <span>github.com/tungcodeforfun</span>
              </a>
              <a href="https://linkedin.com/in/tungngvyen" target="_blank" rel="noopener noreferrer" className="contact-btn">
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </span>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Dock */}
      <div className="dock">
        <div className="dock-container">
          {dockItems.map((item) => (
            <button
              key={item.id}
              className={`dock-item ${activeWindow === item.id ? 'active' : ''}`}
              onClick={() => openWindow(item.id)}
            >
              <span className="dock-icon"><DockIcon type={item.id} /></span>
              {(windowStates[item.id].open && !windowStates[item.id].minimized) && <span className="dock-indicator"></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
