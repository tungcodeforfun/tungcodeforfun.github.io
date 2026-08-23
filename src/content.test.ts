import { experience, focus, freelance, navigation, profile, projects } from './content'

describe('content', () => {
  it('has a complete profile with valid links', () => {
    expect(profile.name).toBe('Tung Nguyen')
    expect(profile.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/)
    expect(profile.github).toMatch(/^https:\/\/github\.com\//)
    expect(profile.linkedin).toMatch(/^https:\/\/linkedin\.com\/in\//)
  })

  it('lists four focus areas with titles and bodies', () => {
    expect(focus).toHaveLength(4)
    for (const item of focus) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.body.length).toBeGreaterThan(0)
    }
  })

  it('orders experience newest first with ISO start dates', () => {
    const starts = experience.map((role) => role.start)
    expect([...starts].sort().reverse()).toEqual(starts)
    for (const role of experience) {
      expect(role.start).toMatch(/^\d{4}-\d{2}$/)
      expect(role.bullets.length).toBeGreaterThan(0)
      expect(role.skills.length).toBeGreaterThan(0)
    }
  })

  it('points every project at a GitHub repo with a stack', () => {
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      expect(project.url).toMatch(/^https:\/\/github\.com\/tungcodeforfun\//)
      expect(project.stack.length).toBeGreaterThan(0)
    }
  })

  it('describes contract work with a booking target', () => {
    expect(freelance.offers.length).toBeGreaterThanOrEqual(3)
    expect(freelance.process.length).toBeGreaterThan(0)
    expect(freelance.bookingUrl).toMatch(/^(https:\/\/|mailto:)/)
  })

  it('navigates only to in-page anchors', () => {
    for (const item of navigation) expect(item.href).toMatch(/^#/)
  })
})
