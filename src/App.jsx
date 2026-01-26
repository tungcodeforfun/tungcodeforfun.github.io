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

  // Panel resize state - Reference: blog.openreplay.com/resizable-split-panes-from-scratch/
  const [panelWidths, setPanelWidths] = useState({
    notesSidebar: 180,
    notesList: 220,
    messagesSidebar: 260,
    contactsSidebar: 220
  })
  const panelResizeState = useRef({ isResizing: false, panel: null, startX: 0, startWidth: 0 })

  // Window sizes - sized to fit multi-panel app layouts comfortably
  // Using 16:10 aspect ratio (standard Mac display ratio)
  const windowWidth = 880
  const windowHeight = 550  // 880:550 = 16:10 ratio
  const gap = 10

  // Calculate centered 2x2 grid positions
  const gridWidth = windowWidth * 2 + gap
  const gridHeight = windowHeight * 2 + gap
  const menuBarHeight = 28  // macOS menu bar
  const dockHeight = 70     // macOS dock area
  const availableHeight = window.innerHeight - menuBarHeight - dockHeight
  const startX = Math.max(40, (window.innerWidth - gridWidth) / 2)
  const startY = Math.max(menuBarHeight + 20, menuBarHeight + (availableHeight - gridHeight) / 2)

  // Window positions - 2x2 grid layout (Mission Control style)
  const defaultPositions = {
    about: { x: startX, y: startY },                              // Top-left
    experience: { x: startX + windowWidth + gap, y: startY },     // Top-right
    projects: { x: startX, y: startY + windowHeight + gap },      // Bottom-left
    contact: { x: startX + windowWidth + gap, y: startY + windowHeight + gap }  // Bottom-right
  }

  // Window sizes - uniform 16:10 aspect ratio
  const defaultSizes = {
    about: { w: windowWidth, h: windowHeight },
    experience: { w: windowWidth, h: windowHeight },
    projects: { w: windowWidth, h: windowHeight },
    contact: { w: windowWidth, h: windowHeight }
  }

  // Use refs for positions and sizes to avoid re-renders during drag/resize
  const windowPositions = useRef({ ...defaultPositions })
  const windowSizes = useRef({ ...defaultSizes })

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

  // Panel resizer handlers - Reference: tinloof.com/blog/how-to-make-your-own-splitpane-react-component-with-0-dependencies
  const panelConstraints = {
    notesSidebar: { min: 100, max: 300 },
    notesList: { min: 150, max: 400 },
    messagesSidebar: { min: 180, max: 400 },
    contactsSidebar: { min: 150, max: 350 }
  }

  const handlePanelResizeStart = (e, panel) => {
    e.preventDefault()
    e.stopPropagation()
    panelResizeState.current = {
      isResizing: true,
      panel,
      startX: e.clientX,
      startWidth: panelWidths[panel]
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handlePanelResizeMove)
    document.addEventListener('mouseup', handlePanelResizeEnd)
  }

  const handlePanelResizeMove = (e) => {
    if (!panelResizeState.current.isResizing) return
    const { panel, startX, startWidth } = panelResizeState.current
    const delta = e.clientX - startX
    const { min, max } = panelConstraints[panel]
    const newWidth = Math.max(min, Math.min(max, startWidth + delta))
    setPanelWidths(prev => ({ ...prev, [panel]: newWidth }))
  }

  const handlePanelResizeEnd = () => {
    panelResizeState.current = { isResizing: false, panel: null, startX: 0, startWidth: 0 }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', handlePanelResizeMove)
    document.removeEventListener('mouseup', handlePanelResizeEnd)
  }

  // Drag handlers using direct DOM manipulation for performance
  const handleDragStart = (e, windowId) => {
    // Always bring window to front when clicking anywhere on it
    bringToFront(windowId)

    // Only start dragging if clicking on header (not content, traffic lights, or resize handles)
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

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = (e) => {
    if (!dragState.current) return
    const { id, startX, startY, origX, origY } = dragState.current
    const size = windowSizes.current[id]

    // Constrain window position (can't go under menu bar or dock)
    const minY = menuBarHeight
    const maxY = window.innerHeight - dockHeight - size.h
    const minX = -size.w + 100  // Allow partial off-screen left
    const maxX = window.innerWidth - 100  // Allow partial off-screen right

    const newX = Math.max(minX, Math.min(maxX, origX + (e.clientX - startX)))
    const newY = Math.max(minY, Math.min(maxY, origY + (e.clientY - startY)))

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
    if (direction.includes('s')) {
      const maxH = window.innerHeight - dockHeight - origY
      newH = Math.max(200, Math.min(maxH, origH + deltaY))
    }
    if (direction.includes('n')) {
      newH = Math.max(200, origH - deltaY)
      newY = Math.max(menuBarHeight, origY + (origH - newH))
      newH = origY + origH - newY  // Recalculate height based on constrained Y
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

  // Apple System Colors for icons
  const appleColors = {
    blue: '#0A84FF',
    green: '#30D158',
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
    teal: '#64D2FF'
  }

  const DockIcon = ({ type }) => {
    // macOS app icons use a "squircle" shape (superellipse) with ~22% corner radius
    // Reference: liamrosenfeld.com/posts/apple_icon_quest/, applypixels.com/blog/the-hunt-for-the-squircle
    // Reference: Wikimedia Commons Apple icon files, logos.fandom.com/wiki/Notes_(iOS)
    const icons = {
      about: (
        // Notes app icon - macOS Sequoia/Sonoma style
        // Reference: commons.wikimedia.org/wiki/File:Apple_Notes_icon.svg
        // Yellow/orange gradient background with white lined notepad
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="notesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE27A" />
              <stop offset="100%" stopColor="#FFBF00" />
            </linearGradient>
          </defs>
          {/* Yellow squircle background */}
          <rect width="120" height="120" rx="26.5" fill="url(#notesGrad)" />
          {/* White notepad with slight shadow */}
          <rect x="22" y="22" width="76" height="82" rx="8" fill="#fff" filter="url(#noteShadow)" />
          <defs>
            <filter id="noteShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          {/* Notepad lines */}
          <line x1="30" y1="40" x2="90" y2="40" stroke="#E8E8E8" strokeWidth="1.5" />
          <line x1="30" y1="52" x2="90" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
          <line x1="30" y1="64" x2="90" y2="64" stroke="#E8E8E8" strokeWidth="1.5" />
          <line x1="30" y1="76" x2="90" y2="76" stroke="#E8E8E8" strokeWidth="1.5" />
          <line x1="30" y1="88" x2="90" y2="88" stroke="#E8E8E8" strokeWidth="1.5" />
          {/* Yellow highlight title text */}
          <rect x="30" y="44" width="40" height="5" rx="2" fill="#FFD426" />
          {/* Gray text lines */}
          <rect x="30" y="56" width="52" height="3" rx="1.5" fill="#C7C7C7" />
          <rect x="30" y="68" width="44" height="3" rx="1.5" fill="#C7C7C7" />
          <rect x="30" y="80" width="36" height="3" rx="1.5" fill="#C7C7C7" />
        </svg>
      ),
      experience: (
        // Messages app icon - macOS Sequoia/Sonoma style
        // Reference: commons.wikimedia.org/wiki/File:IMessage_logo.svg
        // Reference: logos.fandom.com/wiki/Messages_(iOS) - green since Big Sur
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="messagesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#65D96A" />
              <stop offset="100%" stopColor="#2DC83A" />
            </linearGradient>
          </defs>
          {/* Green squircle background */}
          <rect width="120" height="120" rx="26.5" fill="url(#messagesGrad)" />
          {/* White chat bubble - accurate Apple shape */}
          <ellipse cx="60" cy="52" rx="34" ry="28" fill="#fff" />
          {/* Bubble tail pointing down-left */}
          <path d="M32 68 Q28 82 24 88 Q38 80 42 72 Z" fill="#fff" />
        </svg>
      ),
      projects: (
        // Finder app icon - macOS Sequoia/Sonoma style
        // Reference: svgrepo.com/svg/337803/mac-finder, creativebloq.com/design/apple-changed-the-finder-icon
        // Classic design: darker blue on LEFT, lighter blue on RIGHT
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="finderBlueLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#42A5F5" />
              <stop offset="100%" stopColor="#1E88E5" />
            </linearGradient>
            <linearGradient id="finderBlueRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#90CAF9" />
              <stop offset="100%" stopColor="#64B5F6" />
            </linearGradient>
            <clipPath id="finderClip">
              <rect width="120" height="120" rx="26.5" />
            </clipPath>
          </defs>
          <g clipPath="url(#finderClip)">
            {/* Left half - darker blue (classic Finder) */}
            <rect x="0" y="0" width="60" height="120" fill="url(#finderBlueLeft)" />
            {/* Right half - lighter blue */}
            <rect x="60" y="0" width="60" height="120" fill="url(#finderBlueRight)" />
          </g>
          {/* Face features */}
          {/* Eyes */}
          <ellipse cx="42" cy="48" rx="7" ry="11" fill="#fff" />
          <ellipse cx="78" cy="48" rx="7" ry="11" fill="#fff" />
          {/* Pupils - looking slightly down */}
          <circle cx="42" cy="51" r="3.5" fill="#1565C0" />
          <circle cx="78" cy="51" r="3.5" fill="#1565C0" />
          {/* Nose line */}
          <line x1="60" y1="38" x2="60" y2="70" stroke="#1565C0" strokeWidth="4" strokeLinecap="round" />
          {/* Smile */}
          <path d="M36 78 Q60 96 84 78" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
      ),
      contact: (
        // Contacts app icon - macOS Sequoia/Sonoma style
        // Reference: iconscout.com/icons/apple-contacts, en.wikipedia.org/wiki/Contacts_(Apple)
        // Tan/cream address book with brown spine and person silhouette
        <svg viewBox="0 0 120 120" className="app-icon">
          <defs>
            <linearGradient id="contactsBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F5EDE4" />
              <stop offset="100%" stopColor="#E8D9C8" />
            </linearGradient>
            <linearGradient id="contactsSpine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B7355" />
              <stop offset="50%" stopColor="#A08468" />
              <stop offset="100%" stopColor="#7A6548" />
            </linearGradient>
            <clipPath id="contactsClip">
              <rect width="120" height="120" rx="26.5" />
            </clipPath>
          </defs>
          {/* Tan squircle background */}
          <rect width="120" height="120" rx="26.5" fill="url(#contactsBg)" />
          {/* Brown book spine on left */}
          <g clipPath="url(#contactsClip)">
            <rect x="10" y="0" width="22" height="120" fill="url(#contactsSpine)" />
          </g>
          {/* White page area */}
          <rect x="32" y="18" width="72" height="84" rx="4" fill="#FEFEFE" />
          {/* Page edge shadow */}
          <rect x="32" y="18" width="2" height="84" fill="rgba(0,0,0,0.06)" />
          {/* Contact silhouette - head */}
          <circle cx="68" cy="46" r="14" fill="#BEBEBE" />
          {/* Contact silhouette - shoulders/body */}
          <ellipse cx="68" cy="82" rx="24" ry="14" fill="#BEBEBE" />
          {/* Colored index tabs */}
          <rect x="102" y="24" width="8" height="14" rx="2" fill="#FF3B30" />
          <rect x="102" y="44" width="8" height="14" rx="2" fill="#FF9500" />
          <rect x="102" y="64" width="8" height="14" rx="2" fill="#34C759" />
          <rect x="102" y="84" width="8" height="14" rx="2" fill="#007AFF" />
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
        <div className="window-header">
          <div className="traffic-lights">
            <button className="light red" onClick={(e) => closeWindow(e, id)} title="Close">
              <svg viewBox="0 0 12 12"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="#4d0000" strokeWidth="1.1" strokeLinecap="round" /></svg>
            </button>
            <button className="light yellow" onClick={(e) => minimizeWindow(e, id)} title="Minimize">
              <svg viewBox="0 0 12 12"><path d="M2.5 6h7" stroke="#995700" strokeWidth="1.1" strokeLinecap="round" /></svg>
            </button>
            <button className="light green" onClick={(e) => maximizeWindow(e, id)} title="Enter Full Screen">
              <svg viewBox="0 0 12 12">
                {/* macOS fullscreen arrows pointing to corners */}
                <path d="M2.5 2.5l2.8 2.8M9.5 9.5l-2.8-2.8M9.5 2.5l-2.8 2.8M2.5 9.5l2.8-2.8" stroke="#006400" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <span className="window-title">{title}</span>
        </div>
        <div className="window-content">
          {content}
        </div>
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

  // Notes data for 3-panel layout
  const notesData = [
    { id: 'about', title: 'About Me', date: 'Today', preview: 'Senior Software Engineer at EY...' },
    { id: 'education', title: 'Education', date: 'Yesterday', preview: 'Virginia Tech - B.S. Computer Science' },
    { id: 'skills', title: 'Skills', date: 'Dec 2024', preview: 'Java, Python, JavaScript, AWS...' }
  ]
  const [activeNote, setActiveNote] = useState('about')

  // Mobile content sections
  const windowContents = {
    about: (
      <div className="notes-layout">
        {/* Sidebar - Folders */}
        <div className="notes-sidebar" style={{ width: panelWidths.notesSidebar }}>
          <div className="notes-sidebar-header">iCloud</div>
          <div className="notes-folder-list">
            <div className="notes-folder-item active">
              <span className="notes-folder-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                </svg>
              </span>
              <span>All Notes</span>
              <span className="notes-folder-count">3</span>
            </div>
            <div className="notes-folder-item">
              <span className="notes-folder-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </span>
              <span>Portfolio</span>
              <span className="notes-folder-count">3</span>
            </div>
            <div className="notes-folder-item">
              <span className="notes-folder-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </span>
              <span>Favorites</span>
              <span className="notes-folder-count">1</span>
            </div>
          </div>
        </div>

        {/* Resizer between sidebar and list */}
        <div
          className="panel-resizer"
          onMouseDown={(e) => handlePanelResizeStart(e, 'notesSidebar')}
        />

        {/* Notes List - Middle Panel */}
        <div className="notes-list-panel" style={{ width: panelWidths.notesList }}>
          <div className="notes-list-header">All Notes</div>
          <div className="notes-list">
            {notesData.map((note) => (
              <div
                key={note.id}
                className={`notes-list-item ${activeNote === note.id ? 'active' : ''}`}
                onClick={() => setActiveNote(note.id)}
              >
                <div className="notes-list-item-title">{note.title}</div>
                <div className="notes-list-item-date">{note.date}</div>
                <div className="notes-list-item-preview">{note.preview}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Resizer between list and content */}
        <div
          className="panel-resizer"
          onMouseDown={(e) => handlePanelResizeStart(e, 'notesList')}
        />

        {/* Note Content - Main Panel */}
        <div className="notes-content-panel">
          <div className="notes-content-header">
            <div className="notes-content-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div className="notes-content-body">
            {activeNote === 'about' && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Tung Nguyen</h2>
                <p style={{ color: '#FFD52E', fontWeight: 600, marginBottom: '4px' }}>Senior Software Engineer</p>
                <p style={{ color: 'rgba(235, 235, 245, 0.6)', marginBottom: '16px' }}>Ernst & Young · New York, NY</p>
                <p>3+ years building scalable cloud solutions. Specializing in Java, Python, and AWS infrastructure with a track record of improving system performance by 70%.</p>
              </>
            )}
            {activeNote === 'education' && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Education</h2>
                <p style={{ fontWeight: 600 }}>Virginia Tech</p>
                <p>B.S. Computer Science, 2022</p>
                <p style={{ color: 'rgba(235, 235, 245, 0.6)' }}>Dean's List · Beyond Boundaries Scholar</p>
              </>
            )}
            {activeNote === 'skills' && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Skills</h2>
                <div className="skills-tags">
                  {skills.map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    ),
    experience: (
      <div className="messages-layout">
        {/* Conversation List Sidebar */}
        <div className="messages-sidebar" style={{ width: panelWidths.messagesSidebar }}>
          <div className="messages-sidebar-header">
            <input type="text" className="messages-search" placeholder="Search" readOnly />
            <button className="messages-compose-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="messages-conversation-list">
            <div className="messages-conversation-item active">
              <div className="messages-conv-avatar">
                <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="" />
              </div>
              <div className="messages-conv-info">
                <div className="messages-conv-header">
                  <span className="messages-conv-name">Ernst & Young</span>
                  <span className="messages-conv-time">Now</span>
                </div>
                <div className="messages-conv-preview">Experience & Career</div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className="panel-resizer"
          onMouseDown={(e) => handlePanelResizeStart(e, 'messagesSidebar')}
        />

        {/* Chat Panel */}
        <div className="messages-chat-panel">
          <div className="messages-chat-header">
            <div className="messages-chat-contact">
              <div className="messages-chat-avatar">
                <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="" />
              </div>
              <span className="messages-chat-name">Tung Nguyen</span>
            </div>
          </div>
          <div className="messages-chat-body">
            {experience.map((job) => (
              <div
                key={job.id}
                className={`experience-item expandable ${expandedItems[job.id] ? 'expanded' : ''}`}
                onClick={() => toggleExpand(job.id)}
              >
                <span className="expand-icon">{expandedItems[job.id] ? '−' : '+'}</span>
                <div className="exp-header">
                  <h3>{job.title}</h3>
                </div>
                <div className="exp-company">{job.company} · {job.period}</div>
                <div className="exp-desc">{job.desc}</div>
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
        </div>
      </div>
    ),
    projects: (
      <div className="finder-layout">
        {/* Finder Sidebar */}
        <div className="finder-sidebar">
          <div className="finder-sidebar-section">
            <div className="finder-sidebar-header">Favorites</div>
            <div className="finder-sidebar-item">
              <svg viewBox="0 0 24 24" fill="#007AFF">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span>Desktop</span>
            </div>
            <div className="finder-sidebar-item">
              <svg viewBox="0 0 24 24" fill="#007AFF">
                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
              <span>Documents</span>
            </div>
            <div className="finder-sidebar-item active">
              <svg viewBox="0 0 24 24" fill="#fff">
                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
              <span>Projects</span>
            </div>
          </div>
          <div className="finder-sidebar-section">
            <div className="finder-sidebar-header">Locations</div>
            <div className="finder-sidebar-item">
              <svg viewBox="0 0 24 24" fill="#888">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
              <span>iCloud Drive</span>
            </div>
          </div>
        </div>

        {/* Finder Main Content */}
        <div className="finder-main">
          <div className="finder-toolbar">
            <button className="finder-nav-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button className="finder-nav-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
            <span className="finder-path">Projects</span>
          </div>
          <div className="finder-files">
            {projects.map((proj) => (
              <a
                key={proj.id}
                href={proj.url}
                target="_blank"
                rel="noopener noreferrer"
                className="finder-file-item"
                style={{ textDecoration: 'none' }}
              >
                <span className="finder-file-icon">
                  <svg viewBox="0 0 32 32" fill="none">
                    <path d="M6 4h12l2 2h8a2 2 0 012 2v18a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#64b5f6" />
                    <rect x="4" y="8" width="24" height="18" rx="2" fill="#90caf9" />
                  </svg>
                </span>
                <div className="finder-file-info">
                  <div className="finder-file-name">{proj.name}</div>
                  <div className="finder-file-meta">{proj.tech}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    ),
    contact: (
      <div className="contacts-layout">
        {/* Contacts Sidebar */}
        <div className="contacts-sidebar" style={{ width: panelWidths.contactsSidebar }}>
          <div className="contacts-sidebar-header">
            <input type="text" className="contacts-search" placeholder="Search" readOnly />
          </div>
          <div className="contacts-list">
            <div className="contacts-group-header">T</div>
            <div className="contacts-list-item active">
              <div className="contacts-list-avatar">
                <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="" />
              </div>
              <span className="contacts-list-name">Tung Nguyen</span>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className="panel-resizer"
          onMouseDown={(e) => handlePanelResizeStart(e, 'contactsSidebar')}
        />

        {/* Contact Detail Card */}
        <div className="contacts-detail-panel">
          <div className="contacts-card">
            <div className="contacts-card-avatar">
              <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="" />
            </div>
            <div className="contacts-card-name">Tung Nguyen</div>
            <div className="contacts-card-title">Senior Software Engineer at Ernst & Young</div>

            <div className="contacts-card-actions">
              <a href="mailto:tungnguyen1651@gmail.com" className="contacts-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
                <span>email</span>
              </a>
              <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contacts-action-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
              <a href="https://linkedin.com/in/tungngvyen" target="_blank" rel="noopener noreferrer" className="contacts-action-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>

            <div className="contacts-card-section">
              <div className="contacts-card-label">email</div>
              <a href="mailto:tungnguyen1651@gmail.com" className="contacts-card-value">tungnguyen1651@gmail.com</a>
            </div>

            <div className="contacts-card-section">
              <div className="contacts-card-label">work</div>
              <span className="contacts-card-value" style={{ color: '#fff', cursor: 'default' }}>Ernst & Young · New York, NY</span>
            </div>

            <div className="contacts-card-section">
              <div className="contacts-card-label">GitHub</div>
              <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="contacts-card-value">github.com/tungcodeforfun</a>
            </div>

            <div className="contacts-card-section">
              <div className="contacts-card-label">LinkedIn</div>
              <a href="https://linkedin.com/in/tungngvyen" target="_blank" rel="noopener noreferrer" className="contacts-card-value">linkedin.com/in/tungngvyen</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const windowTitles = {
    about: 'Notes',
    experience: 'Messages',
    projects: 'Finder',
    contact: 'Contacts'
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
        {renderWindow('about', 'Notes', windowContents.about)}

        {renderWindow('experience', 'Messages', windowContents.experience)}

        {renderWindow('projects', 'Finder', windowContents.projects)}

        {renderWindow('contact', 'Contacts', windowContents.contact)}
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
