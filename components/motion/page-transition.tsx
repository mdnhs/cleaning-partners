"use client"

import { useState } from "react"
import { MotionConfig, motion, useReducedMotion } from "motion/react"

// Set once the first page has hydrated: later mounts are client navigations.
let hydrated = false

/**
 * Fades each page in when the visitor navigates to it. The first load keeps
 * the server markup as is (no hidden-then-shown flash, nothing for crawlers
 * to miss). Opacity only: a transform here would become the containing
 * block of the pinned and sticky scroll scenes inside the page.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  const [fade] = useState(() => {
    if (typeof window === "undefined") return false
    const navigated = hydrated
    hydrated = true
    return navigated
  })

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={fade && !reduce ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}
