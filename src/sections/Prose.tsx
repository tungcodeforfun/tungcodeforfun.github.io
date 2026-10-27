import type { ReactNode } from 'react'

const KEYED = /\{(\w+)\|([^}]+)\}/g

export function Prose({ text, className, cue }: { text: string; className?: string; cue?: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(KEYED)) {
    parts.push(text.slice(last, match.index))
    parts.push(
      <b key={match.index} className={`key key--${match[1]}`}>
        {match[2]}
      </b>,
    )
    last = match.index + match[0].length
  }
  parts.push(text.slice(last))
  return (
    <p className={className} data-cue={cue}>
      {parts}
    </p>
  )
}
