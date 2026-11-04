import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"

gsap.registerPlugin(ScrollTrigger, SplitText)

// Play on the way down, rewind when scrolling back above the trigger.
const REPLAY = "play none none reverse"

const q = <T extends Element = HTMLElement>(
  selector: string,
  scope?: Element
) => gsap.utils.toArray<T>(selector, scope)

// Scroll stories shared by the public pages. Called by HomeMotion inside its
// gsap.matchMedia (motion users only), so every tween, split and trigger made
// here is reverted with it. Everything is keyed on the markup the page already
// has plus a few data-* hooks; no copy is touched.
export function pageStory(desktop: boolean): (() => void) | void {
  pageHeroShrinks()
  countUps()
  whyChooseStory(desktop)
  teamStory(desktop)
  cardStory(desktop)
  return cardHover()
}

// An inner page's hero folds into a rounded card as it scrolls away: the sides
// pull in and the bottom corners round off. (The home hero has its own story.)
function pageHeroShrinks() {
  for (const hero of q("[data-hero]")) {
    if (hero.querySelector("[data-hero-badge]")) continue
    gsap.fromTo(
      hero,
      { clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)" },
      {
        clipPath: "inset(0% 3% 0% 3% round 0px 0px 56px 56px)",
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          // From the first scroll, never before: a short hero must not load
          // half-folded.
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      }
    )
  }
}

// Numbers count up once when they arrive; the text always ends as authored.
// Years and other labels that are not quantities are left alone.
function countUps() {
  for (const el of q("[data-countup]")) {
    // The authored text is kept aside: a second run (React strict mode in
    // dev, a re-evaluated media query) must not read a half-counted value.
    el.dataset.countupText ??= el.textContent ?? ""
    const text = el.dataset.countupText
    const match = /^(\d[\d,]*)(.*)$/.exec(text.trim())
    if (!match) continue
    const target = Number(match[1].replaceAll(",", ""))
    if (target >= 1900 && target <= 2100) continue
    const suffix = match[2]
    const counter = { value: 0 }
    el.textContent = `0${suffix}`
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () =>
        gsap.to(counter, {
          value: target,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = `${Math.round(counter.value)}${suffix}`
          },
          onComplete: () => {
            el.textContent = text
          },
        }),
    })
  }
}

// "Why choose us": on desktop the section becomes a sticky stage. A line fills
// across the top while the reasons light up one after another, like going down
// a list. Phones skip the stage and light each card as it passes.
function whyChooseStory(desktop: boolean) {
  const track = document.querySelector<HTMLElement>("[data-story-track]")
  if (!track) return
  const stage = track.querySelector<HTMLElement>("[data-story-stage]")
  const cards = q("[data-story-card]", track)
  const bar = track.querySelector("[data-story-bar]")
  if (cards.length === 0) return

  if (desktop && stage) {
    const own = getComputedStyle(track)
    gsap.set(stage, {
      position: "sticky",
      top: 0,
      height: "100vh",
      display: "flex",
      alignItems: "center",
      paddingTop: own.paddingTop,
      paddingBottom: own.paddingBottom,
    })
    gsap.set(track, {
      // overflow-hidden would make the section a scroll container and stop
      // the stage from sticking; clip crops the same way without that.
      overflow: "clip",
      height: `${100 + cards.length * 70}vh`,
      paddingTop: 0,
      paddingBottom: 0,
    })
    // The picture behind stays one screen tall and rides along with the stage
    // instead of stretching over the whole (now much taller) section.
    const backdrop = track.querySelector<HTMLElement>(":scope > [aria-hidden]")
    if (backdrop)
      gsap.set(backdrop, {
        position: "sticky",
        top: 0,
        inset: "auto",
        height: "100vh",
        marginBottom: "-100vh",
      })
  }

  gsap.set(cards, { autoAlpha: 0.3, y: 24, scale: 0.96 })
  if (desktop && stage) {
    const story = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    })
    if (bar)
      story.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: cards.length }, 0)
    cards.forEach((card, i) =>
      story.to(
        card,
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" },
        i
      )
    )
    story.to({}, { duration: 0.6 })
    return
  }

  for (const card of cards)
    gsap.to(card, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        end: "top 60%",
        scrub: 0.5,
      },
    })
  if (bar)
    gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: track,
          start: "top 80%",
          end: "bottom 60%",
          scrub: true,
        },
      }
    )
}

// Team cards arrive one after another, in order, and each card's contents are
// told in sequence as it scrolls up: the name and bio rise line by line and
// the role settles. (The portrait's own reveal lives in HomeMotion.) Only
// opacity and transform move, and every end state is the card as authored.
function teamStory(desktop: boolean) {
  const cards = q<HTMLElement>("[data-team-list] > li")
  const columns = (card: HTMLElement) =>
    desktop && card.parentElement
      ? getComputedStyle(card.parentElement).gridTemplateColumns.split(" ")
          .length
      : 1
  cards.forEach((card, index) => {
    const textBox = card.lastElementChild as HTMLElement | null
    if (!textBox) return
    const name = textBox.querySelector<HTMLElement>("h3")
    const role = name?.nextElementSibling ?? null
    const bio = textBox.querySelector<HTMLElement>(":scope > p")
    const scrub = (start: string, end: string) => ({
      trigger: card,
      start,
      end,
      scrub: 0.8,
    })

    // The card rises into place; in a row of several the outer ones come from
    // the outside. The sideways offset stays inside the page's side padding,
    // so no horizontal scrollbar appears while a card has not arrived.
    const cols = columns(card)
    const column = index % cols
    gsap.from(card, {
      autoAlpha: 0,
      y: 80,
      x: cols > 1 ? (column - (cols - 1) / 2) * 28 : 0,
      ease: "power2.out",
      scrollTrigger: scrub("top 96%", "top 70%"),
    })
    for (const [el, start, end] of [
      [name, "top 78%", "top 58%"],
      [bio, "top 70%", "top 38%"],
    ] as const) {
      if (!el) continue
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            stagger: 0.25,
            ease: "none",
            scrollTrigger: scrub(start, end),
          }),
      })
    }
    if (role)
      gsap.from(role, {
        autoAlpha: 0,
        y: 14,
        ease: "none",
        scrollTrigger: scrub("top 72%", "top 52%"),
      })
  })
}

// The service cards and article cards are told like the team cards: they
// arrive one after another (outer cards from the outside of a row), then their
// contents follow in order as the card scrolls up: the photo or icon opens,
// the title and copy rise line by line and the link settles. Only opacity,
// transform and clip-path move; every end state is the card as authored.
function cardStory(desktop: boolean) {
  for (const card of q<HTMLElement>("[data-service-card], [data-post-card]")) {
    const list = card.closest("ul, ol")
    const item = card.closest("li") ?? card
    if (!list) continue
    const columns = desktop
      ? getComputedStyle(list).gridTemplateColumns.split(" ").length
      : 1
    const column = Array.from(list.children).indexOf(item) % columns
    const scrub = (start: string, end: string) => ({
      trigger: card,
      start,
      end,
      scrub: 0.8,
    })

    gsap.from(card, {
      autoAlpha: 0,
      y: 70,
      x: columns > 1 ? (column - (columns - 1) / 2) * 28 : 0,
      ease: "power2.out",
      scrollTrigger: scrub("top 97%", "top 74%"),
    })

    // An article's cover opens from the top edge.
    const photo = card.querySelector<HTMLElement>(":scope > div.relative")
    if (photo)
      gsap.fromTo(
        photo,
        { clipPath: "inset(0% 0% 100% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "power2.out",
          scrollTrigger: scrub("top 90%", "top 64%"),
        }
      )

    const title = card.querySelector<HTMLElement>("h3")
    const copy = q<HTMLElement>("p", card).filter(
      (p) => (p.textContent?.length ?? 0) > 30
    )
    const lines: [HTMLElement, string, string][] = []
    if (title) lines.push([title, "top 82%", "top 64%"])
    for (const p of copy) lines.push([p, "top 74%", "top 48%"])
    for (const [el, start, end] of lines)
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            stagger: 0.25,
            ease: "none",
            scrollTrigger: scrub(start, end),
          }),
      })
    for (const link of q<HTMLElement>(":scope > div > a", card))
      gsap.from(link, {
        autoAlpha: 0,
        y: 12,
        ease: "none",
        scrollTrigger: scrub("top 60%", "top 42%"),
      })
  }
}

// Every card with data-card follows the pointer, like the service cards: a
// small 3D tilt and a glow that swells out of the bottom-right corner. Mouse-
// like pointers only; no layout is touched.
function cardHover() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
  const stops: (() => void)[] = []

  for (const card of q("[data-card]")) {
    const tilt = card.offsetWidth > 480 ? 2.5 : 6

    // The glow sits between the card's background and its contents.
    if (getComputedStyle(card).position === "static")
      card.style.position = "relative"
    card.style.isolation = "isolate"
    const glow = document.createElement("div")
    glow.setAttribute("aria-hidden", "true")
    Object.assign(glow.style, {
      position: "absolute",
      inset: "0",
      zIndex: "-1",
      pointerEvents: "none",
      borderRadius: "inherit",
      opacity: "0",
      background:
        "radial-gradient(circle at 100% 100%, rgba(17,177,209,0.24), rgba(40,100,143,0.08) 42%, transparent 70%)",
    })
    card.prepend(glow)
    gsap.set(glow, { transformOrigin: "100% 100%", scale: 0.5 })
    gsap.set(card, { transformPerspective: 900 })

    const quick = (target: Element, prop: string) =>
      gsap.quickTo(target, prop, { duration: 0.6, ease: "power3.out" })
    const rotateX = quick(card, "rotationX")
    const rotateY = quick(card, "rotationY")

    const move = (event: PointerEvent) => {
      const box = card.getBoundingClientRect()
      const px = (event.clientX - box.left) / box.width
      const py = (event.clientY - box.top) / box.height
      rotateY((px - 0.5) * tilt)
      rotateX((0.5 - py) * tilt)
    }
    const enter = () =>
      gsap.to(glow, { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" })
    const leave = () => {
      rotateX(0)
      rotateY(0)
      gsap.to(glow, {
        opacity: 0,
        scale: 0.5,
        duration: 0.5,
        ease: "power3.inOut",
      })
    }

    card.addEventListener("pointermove", move as EventListener)
    card.addEventListener("pointerenter", enter)
    card.addEventListener("pointerleave", leave)
    stops.push(() => {
      card.removeEventListener("pointermove", move as EventListener)
      card.removeEventListener("pointerenter", enter)
      card.removeEventListener("pointerleave", leave)
      glow.remove()
      card.style.removeProperty("isolation")
    })
  }

  return () => stops.forEach((stop) => stop())
}

export { REPLAY }
