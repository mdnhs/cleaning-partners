"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

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
  const ref = useRef<HTMLVideoElement>(null)

  // Safari only autoplays when `muted` is a real DOM attribute and play() is
  // called explicitly; React sets `muted` as a property only, and a
  // client-rendered <video> never gets the attribute, so autoPlay is ignored.
  useEffect(() => {
    const video = ref.current
    if (!allowed || !video) return
    video.defaultMuted = true
    video.muted = true
    video.setAttribute("muted", "")
    video.setAttribute("playsinline", "")
    video.setAttribute("webkit-playsinline", "")
    video.play().catch(() => {
      // Autoplay blocked (e.g. iOS Low Power Mode): keep the poster image.
    })
  }, [allowed, src])

  if (!allowed) return null
  return (
    <video
      ref={ref}
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
