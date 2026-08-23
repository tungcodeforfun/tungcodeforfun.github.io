import { fireEvent, render } from '@testing-library/react'
import { fakeWebGl, stubAnimationGlobals, stubMatchMedia } from '../test/webgl'
import { REDUCED_MOTION_SPEED, RibbonField } from './RibbonField'

describe('RibbonField', () => {
  let raf: ReturnType<typeof stubAnimationGlobals>

  beforeEach(() => {
    raf = stubAnimationGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders nothing but an empty canvas when WebGL is unavailable', () => {
    stubMatchMedia(false)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = render(<RibbonField />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
    expect(raf).not.toHaveBeenCalled()
  })

  it('starts the animation loop when motion is allowed', () => {
    stubMatchMedia(false)
    const gl = fakeWebGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    render(<RibbonField />)
    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('keeps animating under prefers-reduced-motion, slowed and without pointer drift', () => {
    stubMatchMedia(true)
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const gl = fakeWebGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    render(<RibbonField speed={1} />)
    expect(raf).toHaveBeenCalledTimes(1)

    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    const tick = raf.mock.calls[0][0]
    tick(2000)

    expect(gl.uniform1f).toHaveBeenCalledWith('time', REDUCED_MOTION_SPEED)
    expect(gl.uniform2f).toHaveBeenCalledWith('pointer', 0.72, 0.42)
  })

  it('steers toward the pointer when motion is allowed', () => {
    stubMatchMedia(false)
    const gl = fakeWebGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    render(<RibbonField smoothing={1} />)

    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    const tick = raf.mock.calls[0][0]
    tick(16)

    const pointerCalls = gl.uniform2f.mock.calls.filter((call: unknown[]) => call[0] === 'pointer')
    const [, x, y] = pointerCalls[pointerCalls.length - 1]
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(1)
  })
})
