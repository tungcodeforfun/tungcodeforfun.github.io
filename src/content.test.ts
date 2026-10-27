import { profile, projects } from './content'

describe('content', () => {
  it('has a complete profile with valid links', () => {
    expect(profile.name).toBe('Tung Nguyen')
    expect(profile.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/)
    expect(profile.github).toMatch(/^https:\/\/github\.com\//)
    expect(profile.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\//)
  })

  it('points every project at a public GitHub repo', () => {
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      expect(project.url).toMatch(/^https:\/\/github\.com\/tungcodeforfun\//)
    }
  })
})
