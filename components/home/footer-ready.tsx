"use client"

import { useEffect, useRef } from "react"

/**
 * Marks the footer once React has hydrated it. The footer streams in its own
 * Suspense boundary beside the page, so the page's scroll scenes can start
 * before it hydrates; animating its DOM then makes React see markup that does
 * not match the server's. The footer scene waits for this mark.
 */
export function FooterReady() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const footer = ref.current?.closest("footer")
    if (!footer) return
    footer.dataset.hydrated = "true"
    footer.dispatchEvent(new Event("cp:hydrated"))
  }, [])
  return <span ref={ref} hidden />
}
