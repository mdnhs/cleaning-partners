"use client"

import { useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
// Pages share these scenes but not every section, so skip absent targets quietly
gsap.config({ nullTargetWarn: false })

const MOTION_OK = "(prefers-reduced-motion: no-preference)"

/**
 * Wires all home-page animation from data attributes so sections stay
 * server components:
 *   data-intro          hidden by CSS until the hero intro reveals it
 *   data-reveal         fade up when scrolled into view
 *   data-stagger        children fade up in sequence
 *   data-split          heading lines slide up from a mask
 *   data-parallax       background drifts while its section scrolls past
 */
export function HomeMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          motion: MOTION_OK,
          desktop: `(min-width: 1024px) and ${MOTION_OK}`,
        },
        (context) => {
          const { motion, desktop } = context.conditions ?? {}
          if (!motion) return

          // Pinned section first so later triggers measure with its spacer
          if (desktop) servicesStory()
          else servicesList()
          heroIntro()
          heroScroll()
          splitHeadings()
          reveals()
          staggers()
          parallax()
          featureIcons()
          teamPhotos()
          mapScene()
        },
        root
      )
    },
    { scope: root }
  )

  return <div ref={root}>{children}</div>
}

function heroIntro() {
  gsap.set("[data-intro]", { autoAlpha: 1 })
  const title = SplitText.create("[data-hero-title]", {
    type: "words,chars",
    mask: "words",
  })

  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from("[data-header]", { yPercent: -100, duration: 0.8 })
    .from(
      "[data-hero-badge]",
      {
        scale: 0.6,
        rotate: -25,
        autoAlpha: 0,
        duration: 1,
        ease: "back.out(1.7)",
      },
      "-=0.4"
    )
    .from(
      title.chars,
      { yPercent: 110, duration: 0.8, stagger: 0.025 },
      "-=0.6"
    )
    .from("[data-hero-copy]", { y: 24, autoAlpha: 0, duration: 0.7 }, "-=0.5")
    .from(
      "[data-hero-actions] > *",
      { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1 },
      "-=0.4"
    )
    .from("[data-hero-member]", { autoAlpha: 0, duration: 0.6 }, "-=0.3")
}

function heroScroll() {
  const scrollTrigger = {
    trigger: "[data-hero]",
    start: "top top",
    end: "bottom top",
    scrub: true,
  }
  gsap.to("[data-hero-bg]", {
    yPercent: 18,
    scale: 1.12,
    ease: "none",
    scrollTrigger,
  })
  gsap.to("[data-hero-content]", {
    yPercent: -20,
    opacity: 0,
    ease: "none",
    scrollTrigger,
  })
}

function splitHeadings() {
  gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }),
    })
  })
}

function reveals() {
  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 32,
      autoAlpha: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    })
  })
}

function staggers() {
  gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) => {
    gsap.from(el.children, {
      y: 48,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 82%", once: true },
    })
  })
}

function parallax() {
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    gsap.fromTo(
      el,
      { yPercent: -8, scale: 1.2 },
      {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section"),
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    )
  })
}

function featureIcons() {
  gsap.from("[data-feature-icon]", {
    scale: 0.4,
    rotate: -20,
    autoAlpha: 0,
    duration: 0.8,
    stagger: 0.12,
    delay: 0.3,
    ease: "back.out(2)",
    scrollTrigger: { trigger: "[data-features]", start: "top 82%", once: true },
  })
}

function teamPhotos() {
  gsap.utils.toArray<HTMLElement>("[data-team-photo]").forEach((el, i) => {
    gsap
      .timeline({
        delay: i * 0.12 + 0.2,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      })
      .from(el, {
        clipPath: "inset(100% 0% 0% 0%)",
        duration: 1.1,
        ease: "power4.inOut",
      })
      .from(
        el.querySelector("img"),
        { scale: 1.3, duration: 1.4, ease: "power3.out" },
        0
      )
  })
}

/** Scrollytelling: pin services and step through each one as you scroll. */
function servicesStory() {
  const items = gsap.utils.toArray<HTMLElement>("[data-service-item]")
  if (!items.length) return

  gsap.set(items, { autoAlpha: 0.35, x: 32 })
  gsap.set("[data-services-more]", { autoAlpha: 0, y: 20 })

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: "[data-services]",
      start: "top top",
      end: () => `+=${window.innerHeight * 1.4}`,
      pin: true,
      scrub: 0.8,
      refreshPriority: 1,
      invalidateOnRefresh: true,
    },
  })

  const span = items.length + 1
  tl.fromTo(
    "[data-services-img='a']",
    { yPercent: 8 },
    { yPercent: -8, ease: "none", duration: span },
    0
  ).fromTo(
    "[data-services-img='b']",
    { yPercent: 18 },
    { yPercent: -18, ease: "none", duration: span },
    0
  )

  items.forEach((item, i) => {
    tl.to(
      item,
      {
        autoAlpha: 1,
        x: 0,
        borderColor: "#11b1d1",
        boxShadow: "0px 14px 30px 0px rgba(17,177,209,0.18)",
        duration: 0.6,
      },
      i + 0.2
    )
    if (i < items.length - 1) {
      tl.to(
        item,
        {
          borderColor: "#e1eef3",
          boxShadow: "0px 0px 0px 0px rgba(17,177,209,0)",
          duration: 0.4,
        },
        i + 1
      )
    }
  })

  tl.to(
    "[data-services-more]",
    { autoAlpha: 1, y: 0, duration: 0.6 },
    items.length
  )
}

function servicesList() {
  gsap.from(["[data-service-item]", "[data-services-more]"], {
    y: 40,
    autoAlpha: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: "power3.out",
    scrollTrigger: {
      trigger: "[data-service-item]",
      start: "top 85%",
      once: true,
    },
  })
}

function mapScene() {
  gsap.fromTo(
    "[data-map-tiles]",
    { scale: 1.25 },
    {
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "[data-map]",
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
      },
    }
  )
  gsap.from("[data-map-marker]", {
    y: -120,
    autoAlpha: 0,
    duration: 1.2,
    ease: "bounce.out",
    scrollTrigger: { trigger: "[data-map]", start: "top 60%", once: true },
  })
}
