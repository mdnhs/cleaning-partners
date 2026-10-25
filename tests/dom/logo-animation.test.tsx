import { act, render, screen, waitFor } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/about" }))

type Listener = (event: unknown) => void
const players: FakePlayer[] = []
class FakePlayer {
  static setWasmUrl = vi.fn()
  listeners = new Map<string, Listener[]>()
  destroy = vi.fn()
  constructor(public config: Record<string, unknown>) {
    players.push(this)
  }
  addEventListener(type: string, fn: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  removeEventListener() {}
  emit(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type })
  }
}
const imported = vi.fn()
vi.mock("@lottiefiles/dotlottie-web", () => {
  imported()
  return { DotLottie: FakePlayer }
})

import {
  LOTTIE_WASM_URL,
  LogoAnimation,
} from "@/components/home/logo-animation"
import { SiteFooter, type SiteFooterProps } from "@/components/home/site-footer"
import { SiteHeader, type SiteHeaderProps } from "@/components/home/site-header"

const SRC = "/api/v1/media/file/2026/10/a.json"

const header = (animation?: string): SiteHeaderProps => ({
  topBar: {
    phone: "24hr contact: 1",
    phoneHref: "tel:+1",
    email: "a@b.ie",
    emailHref: "mailto:a@b.ie",
    hours: "Always",
  },
  logo: {
    src: "/images/logo.png",
    alt: "Cleaning Partners Ltd.",
    href: "/",
    ...(animation ? { animation } : {}),
  },
  links: [{ label: "About", href: "/about" }],
  cta: { label: "Quote", href: "#contact" },
  menuAria: "Menu",
})

const footer = (animation?: string): SiteFooterProps => ({
  logo: {
    src: "/images/logo.png",
    alt: "Cleaning Partners Ltd.",
    ...(animation ? { animation } : {}),
  },
  tagline: "Tagline",
  quickLinks: { title: "Links", links: [{ label: "About", href: "/about" }] },
  contact: { title: "Contact", lines: ["a", "b"] },
  group: { title: "Group", companies: [] },
  copyright: "(c)",
  legal: {
    privacy: { label: "Privacy", href: "#" },
    terms: { label: "Terms", href: "#" },
  },
})

function Logo({ animation }: { animation?: string }) {
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element -- test fixture */}
      <img src="/images/logo.png" alt="Cleaning Partners Ltd." />
      {animation ? <LogoAnimation src={animation} /> : null}
    </div>
  )
}

function reducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

beforeEach(() => {
  players.length = 0
  imported.mockClear()
  FakePlayer.setWasmUrl.mockClear()
  reducedMotion(false)
})

describe("animated logo (settings.site.logoAnimation)", () => {
  it("without an animation the header and footer render only the static logo", () => {
    for (const html of [
      renderToStaticMarkup(<SiteHeader {...header()} />),
      renderToStaticMarkup(<SiteFooter {...footer()} />),
    ]) {
      expect(html).toContain('alt="Cleaning Partners Ltd."')
      expect(html).not.toContain("<canvas")
      expect(html).not.toContain("data-logo-animation")
    }
  })

  it("the header and footer mount the player in their logo box", async () => {
    const { unmount } = render(<SiteHeader {...header(SRC)} />)
    await waitFor(() => expect(players).toHaveLength(1))
    const headerCanvas = players[0].config.canvas as HTMLCanvasElement
    const headerImg = screen.getByAltText("Cleaning Partners Ltd.")
    expect(headerCanvas.parentElement).toBe(headerImg.parentElement)
    expect(headerImg.parentElement).toHaveAttribute("href", "/")
    unmount()

    render(<SiteFooter {...footer(SRC)} />)
    await waitFor(() => expect(players).toHaveLength(2))
    const footerCanvas = players[1].config.canvas as HTMLCanvasElement
    expect(footerCanvas.parentElement).toBe(
      screen.getByAltText("Cleaning Partners Ltd.").parentElement
    )
  })

  it("server HTML with an animation is the static logo only (the player is client-only)", () => {
    const html = renderToStaticMarkup(<Logo animation={SRC} />)
    expect(html).not.toContain("<canvas")
    expect(html).toContain('alt="Cleaning Partners Ltd."')
  })

  it("mounts the player in the logo box, then hides the image once a frame is drawn", async () => {
    render(<Logo animation={SRC} />)
    await waitFor(() => expect(players).toHaveLength(1))
    expect(FakePlayer.setWasmUrl).toHaveBeenCalledWith(LOTTIE_WASM_URL)
    const player = players[0]
    expect(player.config).toMatchObject({
      src: SRC,
      loop: true,
      autoplay: true,
    })
    const canvas = player.config.canvas as HTMLCanvasElement
    expect(canvas).toHaveAttribute("aria-hidden", "true")
    const img = screen.getByAltText("Cleaning Partners Ltd.")
    // Same box as the image: a child of the logo box.
    expect(canvas.parentElement).toBe(img.parentElement)
    expect(canvas.style.opacity).toBe("0")
    expect(img.style.opacity).toBe("")
    // Loading alone shows nothing; the first drawn frame swaps them.
    act(() => player.emit("load"))
    expect(canvas.style.opacity).toBe("0")
    act(() => player.emit("frame"))
    expect(canvas.style.opacity).toBe("1")
    // Hidden visually, still in the accessibility tree (alt text kept).
    expect(img.style.opacity).toBe("0")
    expect(screen.getByAltText("Cleaning Partners Ltd.")).toBeInTheDocument()
  })

  it("keeps the static logo when the file fails to load", async () => {
    render(<Logo animation={SRC} />)
    await waitFor(() => expect(players).toHaveLength(1))
    act(() => players[0].emit("loadError"))
    const img = screen.getByAltText("Cleaning Partners Ltd.")
    expect(img.style.opacity).toBe("")
    expect(players[0].destroy).toHaveBeenCalled()
    expect(img.parentElement?.querySelector("canvas")).toBeNull()
  })

  it("never loads the player for visitors who reduce motion", async () => {
    reducedMotion(true)
    render(<Logo animation={SRC} />)
    await new Promise((r) => setTimeout(r, 20))
    expect(imported).not.toHaveBeenCalled()
    expect(players).toHaveLength(0)
    expect(document.querySelector("canvas")).toBeNull()
  })
})
