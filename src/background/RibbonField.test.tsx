import { render } from '@testing-library/react'
import { REDUCED_MOTION_QUERY, RibbonField } from './RibbonField'

type FakeGl = { drawArrays: ReturnType<typeof vi.fn> }

/** A WebGL context that accepts every call and reports every compile/link as successful. */
function fakeWebGl(): FakeGl {
  const drawArrays = vi.fn()
  const target: Record<string, unknown> = {
    drawArrays,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
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

  it('draws a single still frame under prefers-reduced-motion', () => {
    stubMatchMedia(true)
    const gl = fakeWebGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    const { rerender } = render(<RibbonField dim={0} />)
    expect(raf).not.toHaveBeenCalled()
    expect(gl.drawArrays).toHaveBeenCalledTimes(1)

    rerender(<RibbonField dim={0.5} />)
    expect(gl.drawArrays).toHaveBeenCalledTimes(2)
    expect(raf).not.toHaveBeenCalled()
  })
})
