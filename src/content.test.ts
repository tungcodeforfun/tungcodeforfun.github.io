import { profile } from './content'

describe('content', () => {
  it('has a complete profile with valid links', () => {
    expect(profile.name).toBe('Tung Nguyen')
    expect(profile.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/)
    expect(profile.github).toMatch(/^https:\/\/github\.com\//)
    expect(profile.linkedin).toMatch(/^https:\/\/(www\.)?linkedin\.com\/in\//)
  })
})
