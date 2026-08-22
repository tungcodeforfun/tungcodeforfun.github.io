import { render, screen } from '@testing-library/react'
import { BackgroundBoundary } from './BackgroundBoundary'

function Explodes(): never {
  throw new Error('no webgl')
}

describe('BackgroundBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <BackgroundBoundary>
        <div data-testid="child" />
      </BackgroundBoundary>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('background-fallback')).not.toBeInTheDocument()
  })

  it('swaps in the static fallback when the shader throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <BackgroundBoundary>
        <Explodes />
      </BackgroundBoundary>,
    )
    expect(screen.getByTestId('background-fallback')).toHaveClass('ribbon-field--static')
    spy.mockRestore()
  })
})
