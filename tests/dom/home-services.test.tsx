import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Services } from "@/components/home/services"

const picture = { src: "/images/a.jpg", alt: "" }

describe("home Services", () => {
  it("renders the same service twice without a React key clash", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const item = {
        title: "Office cleaning",
        description: "Desks and floors.",
        href: "/services/office-cleaning",
      }
      render(
        <Services
          imageA={picture}
          imageB={picture}
          eyebrow="E"
          title="T"
          description="D"
          items={[item, { ...item, description: "Again." }]}
          itemIcon="/images/icon.svg"
          moreText="More"
          cta={{ label: "All services", href: "/services" }}
        />
      )
      expect(
        within(screen.getByRole("list")).getAllByRole("listitem")
      ).toHaveLength(2)
      expect(
        error.mock.calls.some((args) => String(args[0]).includes("same key"))
      ).toBe(false)
    } finally {
      error.mockRestore()
    }
  })
})
