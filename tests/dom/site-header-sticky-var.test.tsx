import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

import { SiteHeader } from "@/components/home/site-header"

// The phone's fixed call/quote bar publishes its height as --sticky-cta-h so
// the chat launcher can ride above it (JW sticky-cta.tsx:33-50).
const props = {
  topBar: {
    phone: "01 234",
    phoneHref: "tel:+3531234",
    email: "hi@example.ie",
    emailHref: "mailto:hi@example.ie",
    hours: "Always open",
  },
  logo: { src: "/logo.png", alt: "Example", href: "/" },
  links: [{ label: "Start", href: "/" }],
  cta: { label: "Ask", href: "#contact" },
  menuAria: "Menu",
  closeMenuAria: "Close",
  mobile: {
    helpTitle: "Need help now?",
    callLabel: "Call",
    allServicesLabel: "All",
    directionsLabel: "Directions",
  },
}

const BAR_HEIGHT = 76
const root = document.documentElement
const value = () => root.style.getPropertyValue("--sticky-cta-h")
const scrollTo = (y: number) =>
  act(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: y })
    window.dispatchEvent(new Event("scroll"))
  })

beforeEach(() => {
  root.style.setProperty("--sticky-cta-h", "unset")
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.hasAttribute("data-sticky-cta") ? BAR_HEIGHT : 0
    }
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  root.style.removeProperty("--sticky-cta-h")
})

describe("SiteHeader --sticky-cta-h", () => {
  it("is 0px at the top, the bar's height once shown, and resets on unmount", () => {
    const view = render(<SiteHeader {...props} />)
    expect(value()).toBe("0px")
    scrollTo(1000)
    expect(value()).toBe(`${BAR_HEIGHT}px`)
    scrollTo(0)
    expect(value()).toBe("0px")
    scrollTo(1000)
    expect(value()).toBe(`${BAR_HEIGHT}px`)
    view.unmount()
    expect(value()).toBe("0px")
  })
})
