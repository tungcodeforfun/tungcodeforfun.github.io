import { render } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { REDUCED_MOTION_QUERY, REDUCED_MOTION_SPEED, RibbonField } from './RibbonField'

type FakeGl = {
  drawArrays: ReturnType<typeof vi.fn>
  uniform1f: ReturnType<typeof vi.fn>
  uniform2f: ReturnType<typeof vi.fn>
}

/** A WebGL context that accepts every call and reports every compile/link as successful. */
function fakeWebGl(): FakeGl {
  const drawArrays = vi.fn()
  const uniform1f = vi.fn()
  const uniform2f = vi.fn()
  const target: Record<string, unknown> = {
    drawArrays,
    uniform1f,
    uniform2f,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    getAttribLocation: () => 0,
    // Uniform locations are their names so calls can be told apart.
    getUniformLocation: (_program: unknown, name: string) => name,
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
  }
  return new Proxy(target, {
    get: (object, key) => (key in object ? object[key as string] : () => undefined),
  }) as unknown as FakeGl
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === REDUCED_MOTION_QUERY && reduced,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  )
}

class ObserverStub {
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe('RibbonField', () => {
  let raf: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ObserverStub)
    vi.stubGlobal('IntersectionObserver', ObserverStub)
    raf = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    const tick = raf.mock.calls[0][0] as (now: number) => void
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
    const tick = raf.mock.calls[0][0] as (now: number) => void
    tick(16)

    const pointerCalls = gl.uniform2f.mock.calls.filter((call: unknown[]) => call[0] === 'pointer')
    const [, x, y] = pointerCalls[pointerCalls.length - 1]
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(1)
  })
})
