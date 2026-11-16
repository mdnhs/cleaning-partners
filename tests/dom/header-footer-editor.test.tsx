import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))
// The editors have their own tests: only which one each tab shows matters here.
vi.mock("@/components/admin/settings/settings-editor", () => ({
  SettingsEditor: ({ settingsKey }: { settingsKey: string }) => (
    <div data-testid="editor">{settingsKey}</div>
  ),
}))
vi.mock("@/components/admin/collections/collection-screen", () => ({
  CollectionScreen: ({ name }: { name: string }) => (
    <div data-testid="collection">{name}</div>
  ),
}))

import { HeaderFooterEditor } from "@/components/admin/website/header-footer-editor"

describe("HeaderFooterEditor", () => {
  it("is two horizontal tabs: Header (navigation) and Footer", () => {
    render(
      <HeaderFooterEditor
        initial="header"
        tabs={["header", "footer"]}
        canMicrocopy
      />
    )
    const list = screen.getByRole("tablist", { name: "Header and footer" })
    // Base UI sets aria-orientation only for a vertical list.
    expect(list).not.toHaveAttribute("aria-orientation", "vertical")
    expect(list.getAttribute("data-orientation") ?? "horizontal").toBe(
      "horizontal"
    )
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Header",
      "Footer",
    ])
    expect(screen.getByTestId("editor")).toHaveTextContent("navigation")
    expect(screen.queryByTestId("collection")).toBeNull()
  })

  it("the Footer tab holds the footer, the group companies and a microcopy link", async () => {
    const user = userEvent.setup()
    render(
      <HeaderFooterEditor
        initial="header"
        tabs={["header", "footer"]}
        canMicrocopy
      />
    )
    await user.click(screen.getByRole("tab", { name: "Footer" }))
    expect(screen.getByTestId("editor")).toHaveTextContent("footer")
    expect(screen.getByTestId("collection")).toHaveTextContent(
      "group-companies"
    )
    expect(
      screen.getByRole("link", { name: /forms & microcopy/i })
    ).toHaveAttribute("href", "/admin/website/header-footer/microcopy")
  })

  it("opens on the requested tab and hides the microcopy link without access", () => {
    render(
      <HeaderFooterEditor
        initial="footer"
        tabs={["header", "footer"]}
        canMicrocopy={false}
      />
    )
    expect(screen.getByRole("tab", { name: "Footer" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.queryByRole("link", { name: /microcopy/i })).toBeNull()
  })
})
