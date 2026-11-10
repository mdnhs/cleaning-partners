"use client"

import { useSyncExternalStore } from "react"

const noop = () => () => {}

/**
 * `initial` for a list item that should fade up when it is added later (a
 * filter shows it again) but not on the first render, which must stay as the
 * server wrote it. Items hydrated with the page get `false`; items mounted
 * afterwards get the start state.
 */
export function useEntrance() {
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  return client ? { opacity: 0, y: 14 } : (false as const)
}
