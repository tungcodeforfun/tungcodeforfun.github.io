import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders every section with a heading and landmark navigation', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tung Nguyen')
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument()
    for (const name of [/work on/i, /contract work/i, /experience/i, /projects/i, /hello/i]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('link', { name: /github/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /book a call/i }).length).toBe(2)
  })
})
