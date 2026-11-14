import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { IconCardsSection } from "@/components/home/icon-cards-section"

const cards = [
  { title: "Skilled Cleaners", description: "Trained.", icon: "/a.png" },
  { title: "Trusted Service", description: "Trusted.", icon: "/b.png" },
]

describe("IconCardsSection", () => {
  it("with a background: the photo section the page story animates", () => {
    const { container } = render(
      <IconCardsSection
        background="/bg.png"
        eyebrow="CLEANING PARTNERS"
        title="Why Choose Us?"
        description="High standards."
        cards={cards}
      />
    )
    expect(container.querySelector("section")).toHaveAttribute(
      "data-story-track"
    )
    const list = screen.getByRole("list")
    expect(list).toHaveAttribute("data-features")
    expect(list.querySelectorAll("[data-feature-icon]")).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-white")
    expect(
      within(list)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent)
    ).toEqual(["Skilled Cleaners", "Trusted Service"])
  })

  it("without a background: light cards on white", () => {
    const { container } = render(
      <IconCardsSection
        eyebrow="WHY JOIN US"
        title="Why Work With Us"
        description="Benefits."
        cards={cards}
      />
    )
    expect(container.querySelector("section")).not.toHaveAttribute(
      "data-story-track"
    )
    const list = screen.getByRole("list")
    expect(list).toHaveAttribute("data-stagger")
    expect(list).not.toHaveAttribute("data-features")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    for (const li of items) expect(li).toHaveAttribute("data-card", "light")
    expect(screen.getByRole("heading", { level: 2 })).not.toHaveClass(
      "text-white"
    )
  })
})
