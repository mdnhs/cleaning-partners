import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const pathname = vi.hoisted(() => ({ current: "/admin/help" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

import {
  HelpArticleView,
  HelpOverview,
  HelpShell,
} from "@/components/admin/help/help-view"
import {
  groupedArticles,
  HELP_GROUPS,
  helpArticle,
} from "@/lib/admin/help/registry"

afterEach(() => cleanup())

describe("Help overview", () => {
  it("shows a card per group the role can read and the owners to ask", () => {
    render(
      <HelpOverview
        roles={["owner"]}
        owners={[{ name: "Dee Owner", email: "dee@example.ie" }]}
      />
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Help" })
    ).toBeVisible()
    for (const group of HELP_GROUPS)
      expect(
        screen.getByRole("heading", { level: 2, name: group.label })
      ).toBeVisible()
    expect(
      screen.getByRole("link", { name: /Read the guide/ })
    ).toHaveAttribute("href", "/admin/help/getting-started")
    expect(
      screen.getByRole("link", { name: "dee@example.ie" })
    ).toHaveAttribute("href", "mailto:dee@example.ie")
  })

  it("leaves out the groups whose screens the role cannot open", () => {
    render(<HelpOverview roles={["intake"]} />)
    const visible = groupedArticles(["intake"]).map((group) => group.label)
    expect(visible).not.toContain("Website")
    expect(
      screen.queryByRole("heading", { level: 2, name: "Website" })
    ).toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Enquiries & chat" })
    ).toBeVisible()
    expect(screen.queryByText("Who to ask")).toBeNull()
  })
})

describe("Help article", () => {
  it("has a breadcrumb, a lead, its sections and previous/next", () => {
    const article = helpArticle("services")!
    pathname.current = "/admin/help/services"
    render(<HelpArticleView article={article} roles={["owner"]} />)
    expect(
      screen.getByRole("heading", { level: 1, name: article.title })
    ).toBeVisible()
    const crumbs = screen.getByRole("navigation", { name: /breadcrumb/i })
    expect(within(crumbs).getByRole("link", { name: "Help" })).toHaveAttribute(
      "href",
      "/admin/help"
    )
    for (const section of article.sections)
      expect(screen.getByRole("heading", { name: section.title })).toBeVisible()
    const pager = screen.getByRole("navigation", { name: "Pagination" })
    expect(within(pager).getAllByRole("link")).toHaveLength(2)
  })

  it("leaves out an open-screen button the role cannot follow", () => {
    const article = helpArticle("enquiries")!
    render(<HelpArticleView article={article} roles={["intake"]} />)
    expect(screen.getByRole("link", { name: /Open Enquiries/ })).toBeVisible()
    cleanup()
    // A viewer cannot read this article at all, so its open buttons never render.
    render(
      <HelpArticleView
        article={helpArticle("website-overview")!}
        roles={["viewer"]}
      />
    )
    expect(screen.getByRole("link", { name: /Open Home/ })).toBeVisible()
  })
})

describe("Help shell", () => {
  it("lists the topics by group beside the page", () => {
    pathname.current = "/admin/help/getting-started"
    render(
      <HelpShell roles={["owner"]}>
        <p>Body</p>
      </HelpShell>
    )
    expect(screen.getByText("Body")).toBeVisible()
    expect(screen.getByTestId("help")).toBeInTheDocument()
  })
})
