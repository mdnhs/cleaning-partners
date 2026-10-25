import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ pathname: "/" }))
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }))

import { SiteHeader } from "@/components/home/site-header"

// The header highlights the link whose href matches the current path (R3-6),
// never the one with a given label: renaming a label can't break it.
const props = {
  topBar: {
    phone: "Ring us: 01 234",
    phoneHref: "tel:+3531234",
    email: "hi@example.ie",
    emailHref: "mailto:hi@example.ie",
    hours: "Always open",
  },
  logo: { src: "/logo.png", alt: "Example", href: "/" },
  links: [
    { label: "Start", href: "/" },
    { label: "Who we are", href: "/about" },
    { label: "What we do", href: "/services" },
    { label: "News", href: "/blog" },
    { label: "Talk to us", href: "/contact" },
  ],
  cta: { label: "Ask", href: "#contact" },
  menuAria: "Menu",
}

const current = () =>
  screen
    .getAllByRole("link")
    .filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => a.textContent)

beforeEach(() => {
  nav.pathname = "/"
})

describe("SiteHeader", () => {
  it("renders the copy it is given", () => {
    render(<SiteHeader {...props} />)
    expect(screen.getByText("Ring us: 01 234")).toHaveAttribute(
      "href",
      "tel:+3531234"
    )
    expect(screen.getByText("hi@example.ie")).toHaveAttribute(
      "href",
      "mailto:hi@example.ie"
    )
    expect(screen.getByText("Always open")).toBeInTheDocument()
    expect(screen.getByAltText("Example")).toBeInTheDocument()
    expect(screen.getByLabelText("Menu")).toBeInTheDocument()
    expect(screen.getByText("Ask")).toHaveAttribute("href", "#contact")
  })

  it("marks only Home on /", () => {
    render(<SiteHeader {...props} />)
    expect(current()).toEqual(["Start"])
  })

  it("marks the exact page", () => {
    nav.pathname = "/about"
    render(<SiteHeader {...props} />)
    expect(current()).toEqual(["Who we are"])
  })

  it("marks Services on a service page (prefix match)", () => {
    nav.pathname = "/services/medical-cleaning"
    render(<SiteHeader {...props} />)
    expect(current()).toEqual(["What we do"])
  })

  it("marks Blog on an article page (prefix match)", () => {
    nav.pathname = "/blog/some-article"
    render(<SiteHeader {...props} />)
    expect(current()).toEqual(["News"])
  })

  it("does not mark a link whose href only shares a prefix", () => {
    nav.pathname = "/services-extra"
    render(<SiteHeader {...props} />)
    expect(current()).toEqual([])
  })

  it("matches by href, not by label", () => {
    nav.pathname = "/blog"
    render(
      <SiteHeader
        {...props}
        links={[
          { label: "Blog", href: "/news" },
          { label: "Journal", href: "/blog" },
        ]}
      />
    )
    expect(current()).toEqual(["Journal"])
  })
})
