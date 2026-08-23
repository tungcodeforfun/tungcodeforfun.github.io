import { vi } from 'vitest'
import { REDUCED_MOTION_QUERY } from '../background/shaderLoop'

export type FakeGl = {
  drawArrays: ReturnType<typeof vi.fn>
  uniform1f: ReturnType<typeof vi.fn>
  uniform2f: ReturnType<typeof vi.fn>
}

/** A rendering context that accepts every call and reports every compile/link as successful. */
export function fakeWebGl(): FakeGl {
  const target: Record<string, unknown> = {
    drawArrays: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
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

export function stubMatchMedia(reduced: boolean) {
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

/** Stubs observers and rAF; returns the rAF mock. */
export function stubAnimationGlobals() {
  vi.stubGlobal('ResizeObserver', ObserverStub)
  vi.stubGlobal('IntersectionObserver', ObserverStub)
  const raf = vi.fn<(callback: FrameRequestCallback) => number>(() => 1)
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  return raf
}
