"use client"

import { gsap } from "gsap"
import { useEffect, useLayoutEffect, useRef } from "react"

// Port of JW features/chat/use-widget-motion.ts:1-87 (live chat plan §3.3).
// The launcher motion joins in Task 10.

// jsdom and some embedded browsers have no matchMedia: treat that as "no".
export const prefers = (query: string) =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(query).matches
export const reducedMotion = () => prefers("(prefers-reduced-motion: reduce)")

// About eight frames: a healthy opening has moved well before this.
const SAFETY_MS = 140

// Opening plays this forwards and closing plays it backwards, so a visitor who
// changes their mind halfway sees the panel turn around from where it is.
function buildPanelTimeline(panel: HTMLElement, onClosed: () => void) {
  gsap.set(panel, { transformOrigin: "100% 100%" })
  return gsap
    .timeline({ paused: true, onReverseComplete: onClosed })
    .fromTo(
      panel,
      { opacity: 0, scale: 0.72, y: 36 },
      { opacity: 1, scale: 1, y: 0, duration: 0.46, ease: "back.out(1.6)" }
    )
    .fromTo(
      panel.querySelectorAll("[data-chat-part]"),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" },
      0.16
    )
}

// The panel outlives `open` so it can animate away; `onClosed` tells the
// launcher it may unmount it. With reduced motion it goes at once.
export function usePanelMotion(open: boolean, onClosed: () => void) {
  const panel = useRef<HTMLDivElement>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const closed = useRef(onClosed)
  useEffect(() => {
    closed.current = onClosed
  })

  useLayoutEffect(() => {
    const el = panel.current
    if (!el) return
    if (reducedMotion()) {
      if (!open) closed.current()
      return
    }
    const finish = () => {
      timeline.current?.kill()
      timeline.current = null
      closed.current()
    }
    timeline.current ??= buildPanelTimeline(el, finish)
    if (open) {
      const opening = timeline.current.timeScale(1).play()
      // Safety net: if the opening has not moved shortly after (a stalled
      // ticker, a throttled tab), show the finished panel instead.
      const check = setTimeout(() => {
        if (timeline.current === opening && opening.progress() === 0)
          opening.progress(1)
      }, SAFETY_MS)
      return () => clearTimeout(check)
    }
    // Reversing from the very start never completes: that would strand an
    // invisible panel.
    else if (timeline.current.time() === 0) finish()
    else timeline.current.timeScale(2.2).reverse()
  }, [open])

  // Drop the killed timeline too: React's dev StrictMode remounts effects,
  // and a kept dead timeline would leave the panel at its hidden from-state.
  useEffect(
    () => () => {
      timeline.current?.kill()
      timeline.current = null
    },
    []
  )

  return panel
}
