import type { CSSProperties } from 'react'

export function stills(name: string): CSSProperties {
  const url = (theme: string, width: string) => `url('/stills/${name}-${theme}-${width}.webp')`
  return {
    '--still-lw': url('light', 'wide'),
    '--still-ln': url('light', 'narrow'),
    '--still-dw': url('dark', 'wide'),
    '--still-dn': url('dark', 'narrow'),
  } as CSSProperties
}
