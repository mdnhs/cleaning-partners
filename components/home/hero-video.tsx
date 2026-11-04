"use client"

import { useState, useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Motion allowed and the browser's data saver off. */
function videoAllowed() {
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true
  return !window.matchMedia(REDUCED_MOTION).matches && !saveData
}

/**
 * The hero's background video: muted, looped, inline, behind the overlay and
 * the text, on top of the background image (which stays as its poster).
 * It is only started for visitors who can take it: not with reduced motion
 * and not with the browser's data saver on, so they keep the plain image.
 * The server never renders it (no video before the script runs); it fades in
 * once it can play, so the image never flashes away.
 */
export function HeroVideo({ src }: { src: string }) {
  const allowed = useSyncExternalStore(subscribe, videoAllowed, () => false)
  const [ready, setReady] = useState(false)
  if (!allowed) return null
  return (
    <video
      aria-hidden
      tabIndex={-1}
      autoPlay
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="auto"
      src={src}
      onCanPlay={() => setReady(true)}
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-700",
        ready ? "opacity-100" : "opacity-0"
      )}
    />
  )
}
