"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import "lenis/dist/lenis.css"

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({ autoRaf: false, lerp: 0.1 })
    // Drive Lenis from GSAP's ticker so ScrollTrigger and Lenis share a frame
    const tick = (time: number) => lenis.raf(time * 1000)
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Smooth-scroll in-page hash links (Lenis doesn't cancel the native jump)
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      const link = (event.target as Element).closest('a[href^="#"]')
      const hash = link?.getAttribute("href")
      if (!hash || hash === "#") return
      const target = document.querySelector<HTMLElement>(hash)
      if (!target) return
      event.preventDefault()
      lenis.scrollTo(target, { duration: 1.4 })
      history.pushState(null, "", hash)
    }
    document.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("click", onClick)
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return null
}
