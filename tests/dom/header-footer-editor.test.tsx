import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/website/header-footer",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))
// The list has its own tests: only that it sits in the Footer tab matters.
vi.mock("@/components/admin/collections/collection-screen", () => ({
  CollectionScreen: ({ name }: { name: string }) => (
    <div data-testid="collection">{name}</div>
  ),
}))

import { HeaderFooterEditor } from "@/components/admin/website/header-footer-editor"
import { makeQueryClient } from "@/components/admin/providers"
import { AdminSessionProvider } from "@/components/admin/session-provider"
import { QueryClientProvider } from "@tanstack/react-query"

describe("HeaderFooterEditor", () => {
  it("loads the navigation and footer records into one form with two tabs", async () => {
    const dto = (draft: unknown) => ({
      draft,
      published: draft,
      version: 1,
      status: "published",
      dirty: false,
      publishedAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      updatedBy: null,
    })
    const nav = {
      links: [{ label: "Home", href: "/", children: [], inFooter: true }],
      cta: { label: "Get a Quote", href: "/contact" },
      menuAria: "Open menu",
      closeMenuAria: "Close menu",
      mobile: {
        helpTitle: "Need help now?",
        callLabel: "Call Now",
        allServicesLabel: "View All Services",
        directionsLabel: "Get Directions",
      },
      breadcrumbHome: "Home",
      breadcrumbHomeHref: "/",
    }
    const seen: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input)
        seen.push(url)
        const key = url.split("/settings/")[1]?.split("?")[0]
        const body = key === "navigation" ? dto(nav) : dto({})
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      })
    )
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <AdminSessionProvider
          value={{
            user: {
              id: "u",
              name: "U",
              email: "u@x.test",
              title: null,
              twoFactorEnabled: true,
            },
            roles: ["owner"],
            impersonatedBy: null,
          }}
        >
          <HeaderFooterEditor canMicrocopy />
        </AdminSessionProvider>
      </QueryClientProvider>
    )
    await screen.findByText("Header & footer")
    expect(seen.some((u) => u.endsWith("/settings/navigation"))).toBe(true)
    expect(seen.some((u) => u.endsWith("/settings/footer"))).toBe(true)
    const tabs = await screen.findAllByRole("tab")
    expect(tabs.map((t) => t.textContent)).toEqual(["Header", "Footer"])
    const user = userEvent.setup()
    await user.click(screen.getByRole("tab", { name: "Footer" }))
    expect(await screen.findByTestId("collection")).toHaveTextContent(
      "group-companies"
    )
    vi.unstubAllGlobals()
  })
})
