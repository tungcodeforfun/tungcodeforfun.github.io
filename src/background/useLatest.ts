import { useEffect, useRef } from 'react'

/** A ref that always holds the latest render's value, for reading inside long-lived callbacks. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
