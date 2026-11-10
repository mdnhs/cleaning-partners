"use client"

import { useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { pageStory } from "@/components/motion/page-story"
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
          const stopStory = pageStory(Boolean(desktop))
          heroIntro()
          heroScroll()
          splitHeadings()
          reveals()
          staggers()
          parallax()
          featureIcons()
          teamPhotos()
          mapScene()
          const stopCards = serviceCards()
          const stopFooter = footerStory()
          return () => {
            stopFooter?.()
            stopCards?.()
            stopStory?.()
          }
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
    // fromTo, not from: if the intro ran before (dev double-mount), the
    // buttons are still at their hidden start, and a plain from() would
    // read that as the end state and leave them invisible.
    .fromTo(
      "[data-hero-actions] > *",
      { y: 20, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.1 },
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

// Service cards follow a fine pointer: the card tilts toward it, the icon
// drifts the opposite way, and the corner glow swells in. Touch and coarse
// pointers keep the plain CSS hover only.
function serviceCards() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
  const stops: (() => void)[] = []

  for (const card of gsap.utils.toArray<HTMLElement>("[data-service-card]")) {
    const icon = card.querySelector<HTMLElement>("[data-service-icon]")
    const quick = (target: Element, prop: string) =>
      gsap.quickTo(target, prop, { duration: 0.6, ease: "power3.out" })
    const rotateX = quick(card, "rotationX")
    const rotateY = quick(card, "rotationY")
    const iconX = icon && quick(icon, "x")
    const iconY = icon && quick(icon, "y")
    const glow = card.querySelector<HTMLElement>("[data-service-glow]")
    if (glow) gsap.set(glow, { transformOrigin: "100% 100%" })
    gsap.set(card, { transformPerspective: 900 })

    const move = (event: PointerEvent) => {
      const box = card.getBoundingClientRect()
      const px = (event.clientX - box.left) / box.width
      const py = (event.clientY - box.top) / box.height
      rotateY((px - 0.5) * 8)
      rotateX((0.5 - py) * 8)
      iconX?.((px - 0.5) * -16)
      iconY?.((py - 0.5) * -16)
    }
    const enter = () => {
      if (glow)
        gsap.fromTo(
          glow,
          { scale: 0.5 },
          { scale: 1, duration: 0.9, ease: "power3.out", overwrite: true }
        )
      if (icon)
        gsap.to(icon, { rotate: -6, duration: 0.5, ease: "back.out(3)" })
    }
    const leave = () => {
      if (glow)
        gsap.to(glow, { scale: 0.5, duration: 0.5, ease: "power3.inOut" })
      rotateX(0)
      rotateY(0)
      iconX?.(0)
      iconY?.(0)
      if (icon) gsap.to(icon, { rotate: 0, duration: 0.5, ease: "power3.out" })
    }

    card.addEventListener("pointermove", move as EventListener)
    card.addEventListener("pointerenter", enter)
    card.addEventListener("pointerleave", leave)
    stops.push(() => {
      card.removeEventListener("pointermove", move as EventListener)
      card.removeEventListener("pointerenter", enter)
      card.removeEventListener("pointerleave", leave)
    })
  }

  return () => stops.forEach((stop) => stop())
}

// The footer lives in the layout, outside this component's root, so it is
// reached through the document. It plays once, the first time it nears the
// viewport: the aurora fades in, the logo pops, the columns follow.
// The footer streams in its own boundary, so it may not be hydrated yet:
// animating it first would leave React a DOM that differs from the server's.
// Wait for its mark (components/home/footer-ready.tsx).
function footerStory(): (() => void) | void {
  const footer = document.querySelector("footer")
  if (!footer) return
  if (footer.dataset.hydrated === "true") return buildFooterStory(footer)
  const scene = gsap.context(() => {})
  const start = () => scene.add(() => buildFooterStory(footer))
  footer.addEventListener("cp:hydrated", start, { once: true })
  return () => {
    footer.removeEventListener("cp:hydrated", start)
    scene.revert()
  }
}

function buildFooterStory(footer: HTMLElement) {
  const grid = footer.querySelector("[data-stagger]")
  if (!grid) return
  const [intro, quick, contact, group] = Array.from(grid.children)
  const rule = footer.querySelector(":scope > div > div.h-px")
  const bottom = rule?.nextElementSibling ?? null

  const story = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: { trigger: footer, start: "top 88%", once: true },
  })
  const aurora = footer.querySelector(".footer-aurora")
  if (aurora) story.from(aurora, { autoAlpha: 0, duration: 2 }, 0)
  const logo = intro?.firstElementChild
  if (logo)
    story.from(
      logo,
      {
        autoAlpha: 0,
        scale: 0.7,
        rotate: -8,
        duration: 0.9,
        ease: "back.out(2)",
      },
      0.1
    )
  const tagline = intro?.querySelector("p")
  if (tagline) story.from(tagline, { autoAlpha: 0, y: 16, duration: 0.8 }, 0.3)
  const headings = [quick, contact, group]
    .map((column) => column?.firstElementChild)
    .filter((el): el is Element => Boolean(el))
  story.from(
    headings,
    { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.12 },
    0.25
  )
  const links = [quick, contact].flatMap((column) =>
    Array.from(column?.children ?? []).slice(1)
  )
  story.from(
    links,
    { autoAlpha: 0, x: -18, duration: 0.7, stagger: 0.06 },
    0.45
  )
  const companies = Array.from(group?.children ?? []).slice(1)
  story.from(
    companies,
    { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.12 },
    0.55
  )
  if (rule)
    story.from(rule, { scaleX: 0, transformOrigin: "0 50%", duration: 1 }, 0.8)
  if (bottom) story.from(bottom, { autoAlpha: 0, y: 12, duration: 0.7 }, 1)
}
