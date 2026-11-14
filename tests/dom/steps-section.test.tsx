import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StepsSection } from "@/components/home/steps-section"

const steps = [
  { title: "Get in touch", description: "Call us." },
  { title: "Custom schedule", description: "We plan it." },
  { title: "Daily cleans", description: "We clean." },
]

describe("StepsSection", () => {
  it("compact: zero-padded badges and no intro paragraph", () => {
    const { container } = render(
      <StepsSection
        eyebrow="HOW IT WORKS"
        title="Simple From Start to Finish"
        steps={steps}
        variant="compact"
      />
    )
    const items = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(
      items.map((li) => li.querySelector("[data-timeline-badge]")?.textContent)
    ).toEqual(["01", "02", "03"])
    // Eyebrow, then the step descriptions: nothing else is a paragraph.
    expect(
      [...container.querySelectorAll("p")].map((p) => p.textContent)
    ).toEqual(["HOW IT WORKS", "Call us.", "We plan it.", "We clean."])
  })

  it("compact: an intro, when given, sits under the heading", () => {
    render(
      <StepsSection
        eyebrow="E"
        title="T"
        intro="Under the heading."
        steps={steps}
        variant="compact"
      />
    )
    const intro = screen.getByText("Under the heading.")
    expect(intro.previousElementSibling?.tagName).toBe("H2")
  })

  it("wide: shows the intro and light cards", () => {
    render(
      <StepsSection
        eyebrow="HOW IT WORKS"
        title="Our Hiring Process"
        intro="Usually within two weeks."
        steps={[...steps, { title: "Start", description: "Go." }]}
        variant="wide"
      />
    )
    expect(screen.getByText("Usually within two weeks.")).toBeVisible()
    const items = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(items).toHaveLength(4)
    for (const li of items) expect(li).toHaveAttribute("data-card", "light")
    expect(items[3]!.querySelector("[data-timeline-badge]")?.textContent).toBe(
      "04"
    )
  })
})
