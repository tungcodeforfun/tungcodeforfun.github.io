import './App.css'

function App() {
  const skills = [
    { name: "Java", level: 90 },
    { name: "Python", level: 85 },
    { name: "JavaScript", level: 80 },
    { name: "AWS", level: 85 },
    { name: "Spring Boot", level: 88 },
    { name: "React", level: 75 },
    { name: "Docker", level: 70 },
    { name: "SQL", level: 82 },
    { name: "Git", level: 90 },
  ]

  const achievements = [
    { title: "Senior Engineer", desc: "Promoted at EY", year: "2024" },
    { title: "Performance Boost", desc: "Improved systems by 70%", year: "2024" },
    { title: "Cloud Migration", desc: "Migrated 5+ features to AWS", year: "2024" },
    { title: "Virginia Tech", desc: "B.S. Computer Science", year: "2022" },
    { title: "Dean's List", desc: "3 consecutive years", year: "2022" },
  ]

  const projects = [
    { name: "TCG Price Tracker", tech: "Python", url: "https://github.com/tungcodeforfun/tcg-price-tracker" },
    { name: "Workout Tracker", tech: "Swift", url: "https://github.com/tungcodeforfun/WorkoutTracker" },
    { name: "TungBot", tech: "Python", url: "https://github.com/tungcodeforfun/TungBot" },
  ]

  const xp = {
    years: 3,
    current: 70,
    max: 100,
    level: 25
  }

  return (
    <div className="minecraft-container">
      {/* Main Panel */}
      <div className="mc-panel main-panel">

        {/* Header */}
        <div className="mc-header">
          <div className="mc-title">TUNG NGUYEN</div>
          <div className="mc-subtitle">Senior Software Engineer</div>
        </div>

        {/* Player Stats */}
        <div className="mc-section">
          <div className="section-title">[ PLAYER STATS ]</div>
          <div className="player-card">
            <div className="player-avatar">
              <img src="https://avatars.githubusercontent.com/u/36649688?v=4" alt="avatar" />
            </div>
            <div className="player-info">
              <div className="player-name">TungCodeForFun</div>
              <div className="player-class">Cloud Architect / Backend Developer</div>
              <div className="player-location">New York, NY</div>

              <div className="xp-section">
                <div className="xp-label">
                  <span>LEVEL {xp.level}</span>
                  <span>{xp.years}+ Years XP</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${xp.current}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="mc-section">
          <div className="section-title">[ ABOUT ]</div>
          <div className="mc-text-box">
            <p>Building scalable cloud solutions at Ernst & Young. Specializing in Java, Python, and AWS infrastructure. Track record of improving system performance by 70% and serving 3,000+ locations.</p>
          </div>
        </div>

        {/* Skills Inventory */}
        <div className="mc-section">
          <div className="section-title">[ SKILL INVENTORY ]</div>
          <div className="inventory-grid">
            {skills.map((skill, i) => (
              <div key={i} className="inventory-slot">
                <div className="slot-name">{skill.name}</div>
                <div className="slot-bar">
                  <div className="slot-fill" style={{ width: `${skill.level}%` }}></div>
                </div>
                <div className="slot-level">{skill.level}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="mc-section">
          <div className="section-title">[ ACHIEVEMENTS UNLOCKED ]</div>
          <div className="achievements-list">
            {achievements.map((ach, i) => (
              <div key={i} className="achievement">
                <div className="ach-icon">★</div>
                <div className="ach-info">
                  <div className="ach-title">{ach.title}</div>
                  <div className="ach-desc">{ach.desc}</div>
                </div>
                <div className="ach-year">{ach.year}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects/Crafted Items */}
        <div className="mc-section">
          <div className="section-title">[ CRAFTED PROJECTS ]</div>
          <div className="projects-list">
            {projects.map((proj, i) => (
              <a key={i} href={proj.url} target="_blank" rel="noopener noreferrer" className="project-slot">
                <div className="proj-icon">◆</div>
                <div className="proj-info">
                  <div className="proj-name">{proj.name}</div>
                  <div className="proj-tech">{proj.tech}</div>
                </div>
                <div className="proj-arrow">→</div>
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mc-section">
          <div className="section-title">[ MULTIPLAYER ]</div>
          <div className="contact-buttons">
            <a href="mailto:tungnguyen1651@gmail.com" className="mc-button">
              Send Message
            </a>
            <a href="https://github.com/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="mc-button">
              GitHub
            </a>
            <a href="https://linkedin.com/in/tungcodeforfun" target="_blank" rel="noopener noreferrer" className="mc-button">
              LinkedIn
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mc-footer">
          <span>© 2025 Tung Nguyen</span>
          <span>Built with React</span>
        </div>
      </div>
    </div>
  )
}

export default App
