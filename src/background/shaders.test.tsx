import { render } from '@testing-library/react'
import { fakeWebGl, stubAnimationGlobals, stubMatchMedia } from '../test/webgl'
import { BellField } from './BellField'
import { LiquidForm } from './LiquidForm'
import { StreamConvergence } from './StreamConvergence'

const components = [
  ['StreamConvergence', StreamConvergence],
  ['LiquidForm', LiquidForm],
  ['BellField', BellField],
] as const

describe.each(components)('%s', (_name, Shader) => {
  let raf: ReturnType<typeof stubAnimationGlobals>

  beforeEach(() => {
    raf = stubAnimationGlobals()
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders an empty canvas without WebGL and does not throw', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = render(<Shader />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
    expect(raf).not.toHaveBeenCalled()
  })

  it('starts its frame loop and draws once per tick', () => {
    const gl = fakeWebGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    render(<Shader />)
    expect(raf).toHaveBeenCalledTimes(1)
    const tick = raf.mock.calls[0][0]
    tick(16)
    expect(gl.drawArrays).toHaveBeenCalledTimes(1)
  })
})

describe('LiquidForm transparent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests an alpha context and marks the host transparent', () => {
    stubAnimationGlobals()
    stubMatchMedia(false)
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = render(<LiquidForm transparent />)
    expect(container.firstChild).toHaveClass('shader--transparent')
    expect(getContext).toHaveBeenCalledWith('webgl', expect.objectContaining({ alpha: true }))
  })
})
