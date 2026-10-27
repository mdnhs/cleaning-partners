import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  HELP_GUIDES,
  HELP_TOPICS,
  HelpView,
} from "@/components/admin/help/help-view"

const owner = { name: "Olive Owner", email: "olive@example.ie" }

function open(hash: string) {
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  })
}

afterEach(() => {
  window.location.hash = ""
})

describe("HelpView (docs layout)", () => {
  it("opens on an overview that links every topic, guide and reference page", () => {
    render(<HelpView owners={[owner]} />)
    expect(
      screen.getByRole("heading", { name: "How can we help?" })
    ).toBeInTheDocument()
    const outline = within(
      screen.getByRole("navigation", { name: "Help outline" })
    )
    for (const topic of HELP_TOPICS)
      expect(outline.getByRole("link", { name: topic.title })).toHaveAttribute(
        "href",
        `#${topic.id}`
      )
    for (const guide of HELP_GUIDES)
      expect(
        outline.getByRole("link", { name: guide.title })
      ).toBeInTheDocument()
    expect(
      outline.getByRole("link", { name: "Keyboard shortcuts" })
    ).toHaveAttribute("href", "#shortcuts")
    expect(
      outline.getByRole("link", { name: "Who to contact" })
    ).toHaveAttribute("href", "#contact")
  })

  it("shows one topic as an article with numbered steps and a breadcrumb", () => {
    render(<HelpView owners={[]} />)
    const topic = HELP_TOPICS.find((t) => t.id === "media")!
    open("media")
    expect(
      screen.getByRole("heading", { level: 2, name: topic.title })
    ).toBeInTheDocument()
    const article = within(screen.getByRole("article"))
    for (const step of topic.steps)
      expect(article.getByText(step, { exact: true })).toBeInTheDocument()
    expect(
      article.getByRole("navigation", { name: "Breadcrumb" })
    ).toBeVisible()
    expect(
      article.getByRole("navigation", { name: "Previous and next" })
    ).toBeInTheDocument()
  })

  it("opens a runbook guide", () => {
    render(<HelpView owners={[]} />)
    const guide = HELP_GUIDES[0]!
    open("guide-owner-locked-out")
    const article = within(screen.getByRole("article"))
    expect(
      article.getByRole("heading", { level: 2, name: guide.title })
    ).toBeInTheDocument()
    expect(
      article.getByText(guide.steps[0]!, { exact: true })
    ).toBeInTheDocument()
  })

  it("lists the shortcuts", () => {
    render(<HelpView owners={[]} />)
    open("shortcuts")
    const article = within(screen.getByRole("article"))
    for (const action of [
      "Search and go",
      "AI assistant",
      "Save draft",
      "Close panels",
    ])
      expect(article.getByText(action)).toBeInTheDocument()
    expect(article.getByText("Esc")).toBeInTheDocument()
  })

  it("mails the owners and gives the link a 44 px coarse target", () => {
    render(<HelpView owners={[owner]} />)
    open("contact")
    const link = screen.getByRole("link", { name: /olive@example\.ie/ })
    expect(link).toHaveAttribute("href", "mailto:olive@example.ie")
    expect(link).toHaveClass(
      "inline-flex",
      "items-center",
      "pointer-coarse:min-h-11"
    )
    expect(link.querySelector("span.truncate")).toHaveTextContent(
      "olive@example.ie"
    )
    expect(screen.getByText("Olive Owner")).toBeInTheDocument()
  })

  it("says so when there is no active owner", () => {
    render(<HelpView owners={[]} />)
    open("contact")
    expect(screen.getByText(/no active owner/i)).toBeInTheDocument()
  })

  it("filters the outline as you search, and says when nothing matches", () => {
    render(<HelpView owners={[]} />)
    const outline = within(
      screen.getByRole("navigation", { name: "Help outline" })
    )
    const search = screen.getByRole("searchbox", { name: "Search help" })
    fireEvent.change(search, { target: { value: "password" } })
    expect(
      outline.getByRole("link", { name: "Sign in, passwords and two-factor" })
    ).toBeInTheDocument()
    expect(
      outline.queryByRole("link", { name: "Upload and reuse pictures" })
    ).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: "zzzzqq" } })
    expect(outline.getByText(/Nothing matches/)).toBeInTheDocument()
  })

  it("falls back to the overview for an unknown address", () => {
    render(<HelpView owners={[]} />)
    open("no-such-topic")
    expect(
      screen.getByRole("heading", { name: "How can we help?" })
    ).toBeInTheDocument()
  })
})
