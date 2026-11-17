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
 * once it is playing, so the image never flashes away.
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
    // Older WebKit returns undefined instead of a promise.
    const start = () => video.play()?.catch(() => {})
    const started = video.play()
    // Autoplay blocked (iOS Low Power Mode never autoplays): keep the poster
    // image, and start the video on the visitor's first tap or click, which
    // iOS accepts as the gesture it wants.
    let armed = false
    const arm = () => {
      armed = true
      document.addEventListener("touchend", start, { once: true })
      document.addEventListener("click", start, { once: true })
    }
    if (started) started.catch(arm)
    return () => {
      if (!armed) return
      document.removeEventListener("touchend", start)
      document.removeEventListener("click", start)
    }
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
      // Fade in only once it is really playing: a paused first frame with
      // iOS's play button on top must never replace the poster image.
      onPlaying={() => setReady(true)}
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-700",
        // No native play button over the hero when autoplay is blocked.
        "[&::-webkit-media-controls]:hidden [&::-webkit-media-controls-start-playback-button]:hidden",
        ready ? "opacity-100" : "opacity-0"
      )}
    />
  )
}
