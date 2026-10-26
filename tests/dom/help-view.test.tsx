import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HELP_TOPICS, HelpView } from "@/components/admin/help/help-view"

describe("HelpView ", () => {
  it("lists the shortcuts and mails the owners", () => {
    render(
      <HelpView owners={[{ name: "Olive Owner", email: "olive@example.ie" }]} />
    )
    expect(
      screen.getByRole("heading", { name: "Keyboard shortcuts" })
    ).toBeInTheDocument()
    for (const action of ["Search and go", "Save draft", "Close panels"])
      expect(screen.getByText(action)).toBeInTheDocument()
    expect(screen.getByText("Esc")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Who to contact" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /olive@example\.ie/ })
    ).toHaveAttribute("href", "mailto:olive@example.ie")
    expect(screen.getByText("Olive Owner")).toBeInTheDocument()
    // How-to answers: every topic is listed with numbered steps.
    expect(
      screen.getByRole("heading", { name: "How do I…" })
    ).toBeInTheDocument()
    for (const topic of HELP_TOPICS) {
      expect(screen.getByText(topic.title)).toBeInTheDocument()
      expect(
        screen.getByText(topic.steps[0]!, { exact: true })
      ).toBeInTheDocument()
    }
  })

  it("gives the mailto a 44 px coarse target with a truncating email", () => {
    render(
      <HelpView owners={[{ name: "Olive Owner", email: "olive@example.ie" }]} />
    )
    const link = screen.getByRole("link", { name: /olive@example\.ie/ })
    expect(link).toHaveClass(
      "inline-flex",
      "items-center",
      "pointer-coarse:min-h-11"
    )
    expect(link.querySelector("span.truncate")).toHaveTextContent(
      "olive@example.ie"
    )
  })

  it("says so when there is no active owner", () => {
    render(<HelpView owners={[]} />)
    expect(screen.getByText(/no active owner/i)).toBeInTheDocument()
  })
})
