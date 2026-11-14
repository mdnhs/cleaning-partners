import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotFoundView } from "@/components/not-found-view"

const props = {
  image: "/images/home/hero.png",
  crumb: "Gone",
  title: "Nothing here",
  description: "That address does not exist.",
  home: { label: "Home", href: "/" },
  ariaLabel: "Breadcrumb",
  homeLabel: "Take me home",
}

describe("NotFoundView", () => {
  it("renders the configured heading, text and home button", () => {
    render(<NotFoundView {...props} />)
    expect(
      screen.getByRole("heading", { level: 1, name: "Nothing here" })
    ).toBeDefined()
    expect(screen.getByText("That address does not exist.")).toBeDefined()
    const button = screen.getByRole("link", { name: "Take me home" })
    expect(button.getAttribute("href")).toBe("/")
  })

  it("shows the crumb inside the labelled breadcrumb", () => {
    render(<NotFoundView {...props} />)
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(nav.textContent).toContain("Gone")
  })
})
