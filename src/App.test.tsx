import { render, screen } from '@testing-library/react'
import App from './App'
import { navigation } from './content'

describe('App', () => {
  it('renders the name and a section for every navigation link', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tung Nguyen')
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument()
    for (const item of navigation) {
      const section = container.querySelector(item.href)
      expect(section?.tagName).toBe('SECTION')
      expect(section?.querySelector('h2')).not.toBeNull()
    }
  })
})
