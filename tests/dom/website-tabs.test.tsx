import { render, screen, within } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/admin" } }))
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

import { AdminSessionProvider } from "@/components/admin/session-provider"
import {
  SharedOnPage,
  WebsiteTabs,
} from "@/components/admin/website/website-tabs"
import type { Role } from "@/lib/auth/roles"

function renderAt(path: string, roles: Role[], body: ReactNode) {
  pathname.current = path
  return render(
    <AdminSessionProvider
      value={{
        user: {
          id: "u",
          name: "U",
          email: "u@x.test",
          title: null,
          twoFactorEnabled: true,
        },
        roles,
        impersonatedBy: null,
      }}
    >
      {body}
    </AdminSessionProvider>
  )
}

afterEach(() => {
  pathname.current = "/admin"
})

describe("WebsiteTabs", () => {
  it("lists Home's Page and parts, the current part marked", () => {
    renderAt(
      "/admin/website/home/testimonials",
      ["owner"],
      <WebsiteTabs screen="home" />
    )
    const nav = screen.getByRole("navigation", { name: "Home sections" })
    const links = within(nav).getAllByRole("link")
    expect(links).toHaveLength(6)
    expect(links[0]).toHaveTextContent("Page")
    expect(
      within(nav).getByRole("link", { name: "Testimonials" })
    ).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: "Page" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("renders nothing for an author on Blog (one tab)", () => {
    const { container } = renderAt(
      "/admin/blog",
      ["author"],
      <WebsiteTabs screen="blog" />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("marks Categories, not Articles, on /admin/blog/categories", () => {
    renderAt("/admin/blog/categories", ["owner"], <WebsiteTabs screen="blog" />)
    const nav = screen.getByRole("navigation", { name: "Blog sections" })
    expect(
      within(nav).getByRole("link", { name: "Categories" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      within(nav).getByRole("link", { name: "Articles" })
    ).not.toHaveAttribute("aria-current")
  })
})

describe("SharedOnPage", () => {
  it("lists the parts About shows that are edited on Home", () => {
    renderAt("/admin/website/about", ["owner"], <SharedOnPage page="about" />)
    const section = screen.getByRole("region", { name: "Shared on this page" })
    expect(
      within(section).getByRole("link", {
        name: "Testimonials · edited on Home",
      })
    ).toHaveAttribute("href", "/admin/website/home/testimonials")
    // About's own parts are its tabs, not "shared".
    expect(
      within(section).queryByRole("link", { name: /^Team members/ })
    ).toBeNull()
  })

  it("renders nothing when nothing is shared the roles may read", () => {
    const { container } = renderAt(
      "/admin/website/careers",
      ["intake"],
      <SharedOnPage page="careers" />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
