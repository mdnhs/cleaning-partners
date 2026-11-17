import { act, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Hero } from "@/components/home/hero"

const props = {
  background: "/images/hero.png",
  logo: { src: "/logo.png", alt: "Logo" },
  title: "Title",
  subtitle: "Subtitle",
  primaryCta: { label: "One", href: "#one" },
  secondaryCta: { label: "Two", href: "#two" },
  member: { label: "Member", logo: "/m.png", logoAlt: "M" },
}

function mockEnvironment({
  reducedMotion = false,
  saveData = false,
}: { reducedMotion?: boolean; saveData?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("reduced-motion") ? reducedMotion : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList
  )
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: { saveData },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, "connection")
})

describe("Hero background video", () => {
  it("without a video there is no <video>, only the image", () => {
    mockEnvironment()
    const { container } = render(<Hero {...props} />)
    expect(container.querySelector("video")).toBeNull()
    expect(container.querySelector("[data-hero-bg] img")).not.toBeNull()
  })

  it("plays the video muted, looped and inline behind the text, over the image", () => {
    mockEnvironment()
    const { container } = render(
      <Hero {...props} backgroundVideo="/videos/loop.mp4" />
    )
    const video = container.querySelector("video")!
    expect(video).not.toBeNull()
    expect(video.getAttribute("src")).toBe("/videos/loop.mp4")
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.getAttribute("aria-hidden")).toBe("true")
    expect(video.hasAttribute("playsinline")).toBe(true)
    // The image stays beneath it as the poster and fallback.
    const bg = container.querySelector("[data-hero-bg]")!
    expect(bg.contains(video)).toBe(true)
    expect(bg.querySelector("img")).not.toBeNull()
  })

  it("keeps the plain image for visitors who prefer reduced motion", () => {
    mockEnvironment({ reducedMotion: true })
    const { container } = render(
      <Hero {...props} backgroundVideo="/videos/loop.mp4" />
    )
    expect(container.querySelector("video")).toBeNull()
    expect(container.querySelector("[data-hero-bg] img")).not.toBeNull()
  })

  it("keeps the plain image when the browser's data saver is on", () => {
    mockEnvironment({ saveData: true })
    const { container } = render(
      <Hero {...props} backgroundVideo="/videos/loop.mp4" />
    )
    expect(container.querySelector("video")).toBeNull()
  })

  it("stays hidden until playing, and starts on the first tap when autoplay is blocked", async () => {
    mockEnvironment()
    const play = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("NotAllowedError"))
      .mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play)
    const { container } = render(
      <Hero {...props} backgroundVideo="/videos/loop.mp4" />
    )
    const video = container.querySelector("video")!
    await act(async () => {})
    expect(play).toHaveBeenCalledTimes(1)
    // Blocked (Low Power Mode): the poster image stays, the video is invisible.
    expect(video.className).toContain("opacity-0")
    await act(async () => {
      document.dispatchEvent(new Event("touchend"))
    })
    expect(play).toHaveBeenCalledTimes(2)
    await act(async () => {
      video.dispatchEvent(new Event("playing"))
    })
    expect(video.className).toContain("opacity-100")
  })
})
