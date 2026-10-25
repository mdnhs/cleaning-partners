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

// Phase 3 restores the SiteHeader / SiteFooter cases when they take the logo
// as props; here the player is exercised through LogoAnimation itself.
const SRC = "/api/v1/media/file/2026/10/a.json"

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
