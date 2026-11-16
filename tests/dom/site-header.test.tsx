import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  closeMenuAria: "Close",
  mobile: {
    helpTitle: "Need help now?",
    callLabel: "Call Now",
    allServicesLabel: "View All Services",
    directionsLabel: "Get Directions",
  },
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
    // The header button and the phone's fixed bar both carry the label.
    for (const link of screen.getAllByText("Ask")) {
      expect(link).toHaveAttribute("href", "#contact")
    }
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

  describe("phone menu", () => {
    const withList = {
      ...props,
      links: props.links.map((l) =>
        l.href === "/services"
          ? {
              ...l,
              children: [
                { label: "Medical", href: "/services/medical" },
                { label: "Retail", href: "/services/retail" },
              ],
            }
          : l
      ),
    }
    const openDrawer = async () => {
      const user = userEvent.setup()
      render(<SiteHeader {...withList} />)
      await user.click(screen.getByRole("button", { name: "Menu" }))
      return {
        user,
        nav: await screen.findByRole("navigation", { name: "Menu" }),
      }
    }

    it("starts with every list closed", async () => {
      const { nav } = await openDrawer()
      const toggle = within(nav).getByRole("button", { name: /What we do/ })
      expect(toggle).toHaveAttribute("aria-expanded", "false")
      expect(within(nav).queryByText("Medical")).toBeNull()
    })

    it("opens and closes a list from its row", async () => {
      const { user, nav } = await openDrawer()
      const toggle = within(nav).getByRole("button", { name: /What we do/ })
      await user.click(toggle)
      expect(toggle).toHaveAttribute("aria-expanded", "true")
      expect(await within(nav).findByText("Medical")).toBeInTheDocument()
      expect(within(nav).getByText("View All Services")).toBeInTheDocument()
      await user.click(toggle)
      expect(toggle).toHaveAttribute("aria-expanded", "false")
    })

    it("shows an arrow only on the row that has a list", async () => {
      const { nav } = await openDrawer()
      const rowOf = (text: string) =>
        within(nav).getByText(text).closest("a, button")!
      expect(rowOf("What we do").querySelector("svg")).not.toBeNull()
      for (const text of ["Start", "Who we are", "News", "Talk to us"])
        expect(rowOf(text).querySelector("svg")).toBeNull()
    })
  })
})
