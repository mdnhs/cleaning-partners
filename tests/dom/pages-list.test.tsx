import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  search: "",
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: vi.fn() }),
  usePathname: () => "/admin/pages",
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { AdminSessionProvider } from "@/components/admin/session-provider"
import type { Role } from "@/lib/auth/roles"
import { PagesList } from "@/components/admin/pages/pages-list"
import { makeQueryClient } from "@/components/admin/providers"

const page = (over: Record<string, unknown>) => ({
  key: "home",
  label: "Home",
  template: "home",
  path: "/",
  version: 3,
  status: "published",
  dirty: false,
  publishedAt: "2026-10-01T10:00:00Z",
  updatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  updatedBy: { id: "u1", name: "Edith Editor" },
  ...over,
})

function renderPages(role: Role = "editor") {
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
        roles: [role],
        impersonatedBy: null,
      }}
    >
      <QueryClientProvider client={makeQueryClient()}>
        <PagesList />
      </QueryClientProvider>
    </AdminSessionProvider>
  )
}

const calls: string[] = []

const custom = (over: Record<string, unknown>) => ({
  id: "0192a-spring",
  slug: "spring-clean",
  title: "Spring clean",
  path: "/p/spring-clean",
  seo: {},
  version: 2,
  status: "published",
  dirty: true,
  publishedAt: "2026-10-02T10:00:00Z",
  updatedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  updatedBy: { id: "u2", name: "Mia Marketer" },
  ...over,
})
let customItems: unknown[] = []

beforeEach(() => {
  calls.length = 0
  nav.search = ""
  nav.replace.mockClear()
  customItems = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      if (String(input).includes("/builder-pages"))
        return Response.json({
          items: customItems,
          page: 1,
          pageSize: 100,
          total: customItems.length,
        })
      return Response.json({
        items: [
          page({}),
          page({
            key: "about",
            label: "About",
            path: "/about",
            dirty: true,
          }),
          page({
            key: "terms",
            label: "Terms",
            path: "/terms",
            publishedAt: null,
            status: "draft",
          }),
        ],
      })
    })
  )
})

describe("pages list (JW pattern)", () => {
  it("shows Title, Address, Status and Updated in a card table", async () => {
    renderPages()
    const table = await screen.findByRole("table", { name: "Site pages" })
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent)
    ).toEqual(["Title", "Address", "Status", "Updated"])
    expect(table.closest('[data-slot="table-card"]')).toHaveClass(
      "rounded-card",
      "bg-card"
    )
    // One scroll container (the Table primitive's), and headers wrap like
    // the cells, as before the shadcn Table.
    expect(table.closest('[data-slot="table-card"]')).not.toHaveClass(
      "overflow-x-auto"
    )
    for (const th of within(table).getAllByRole("columnheader"))
      expect(th).toHaveClass("whitespace-normal")
    const rows = within(table).getAllByRole("row").slice(1)
    expect(within(rows[0]).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/admin/pages/home"
    )
    expect(
      within(rows[0]).getByText("/", { selector: "code" })
    ).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent("Published")
    expect(rows[0]).toHaveTextContent("2 hours ago · Edith Editor")
    expect(rows[1]).toHaveTextContent("PublishedUnpublished changes")
    expect(rows[2]).toHaveTextContent("Draft")
  })

  it("lists cards on phones with the same facts", async () => {
    renderPages()
    const list = await screen.findByRole("list", { name: "Site pages" })
    const cards = within(list).getAllByRole("listitem")
    expect(cards).toHaveLength(3)
    expect(cards[2]).toHaveTextContent("Terms")
    expect(cards[2]).toHaveTextContent("/terms")
    expect(cards[2]).toHaveTextContent("Draft")
    // The whole card is the link's target (stretched link), like Services.
    expect(cards[0]).toHaveClass("relative")
    expect(within(cards[0]).getByRole("link", { name: "Home" })).toHaveClass(
      "after:absolute",
      "after:inset-0"
    )
  })

  it("dates rows relative to the last fetch, exact time on hover", async () => {
    renderPages()
    const table = await screen.findByRole("table", { name: "Site pages" })
    const time = within(table).getAllByText(/2 hours ago/, {
      selector: "time",
    })[0]
    expect(time).toHaveAttribute("dateTime")
    expect(time).toHaveAttribute("title")
  })

  it("offers Try again when the list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          // 4xx is final for the admin QueryClient (no retry delay).
          { error: { code: "FORBIDDEN", message: "Not allowed" } },
          { status: 403 }
        )
      )
    )
    renderPages()
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The pages didn't load")
    expect(alert).toHaveTextContent("Not allowed")
    expect(
      within(alert).getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
  })

  it("lists custom pages linking to the builder, with status and editor", async () => {
    customItems = [
      custom({}),
      custom({
        id: "0192b-draft",
        slug: "draft-page",
        title: "Draft page",
        path: "/p/draft-page",
        publishedAt: null,
        status: "draft",
        dirty: false,
        updatedBy: null,
      }),
    ]
    renderPages()
    const table = await screen.findByRole("table", { name: "Custom pages" })
    const rows = within(table).getAllByRole("row").slice(1)
    expect(
      within(rows[0]).getByRole("link", { name: "Spring clean" })
    ).toHaveAttribute("href", "/admin/pages/custom/0192a-spring")
    expect(rows[0]).toHaveTextContent("/p/spring-clean")
    expect(rows[0]).toHaveTextContent("PublishedUnpublished changes")
    expect(rows[0]).toHaveTextContent("3 hours ago · Mia Marketer")
    expect(rows[1]).toHaveTextContent("Draft")
    expect(
      screen.getByRole("heading", { name: "Custom pages" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Site pages" })
    ).toBeInTheDocument()
  })

  it("says so when there are no custom pages", async () => {
    renderPages()
    expect(await screen.findByText("No custom pages yet")).toBeInTheDocument()
  })

  it("shows New page to an editor and opens the dialog", async () => {
    const user = userEvent.setup()
    renderPages()
    await user.click(await screen.findByRole("button", { name: "New page" }))
    const dialog = await screen.findByRole("dialog", { name: "New page" })
    expect(within(dialog).getByLabelText("Title")).toBeInTheDocument()
  })

  it("is read-only for a marketer: no New page, no dialog", async () => {
    customItems = [custom({})]
    renderPages("marketer")
    await screen.findByRole("table", { name: "Custom pages" })
    expect(screen.queryByRole("button", { name: "New page" })).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("?new=1 opens the dialog, and closing it drops the parameter", async () => {
    nav.search = "new=1"
    const user = userEvent.setup()
    renderPages()
    const dialog = await screen.findByRole("dialog", { name: "New page" })
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith("/admin/pages")
    )
  })

  it("?new=1 does nothing for a role that cannot create", async () => {
    nav.search = "new=1"
    renderPages("marketer")
    await screen.findByRole("table", { name: "Site pages" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("offers Try again when the custom list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("/builder-pages")
          ? Response.json(
              { error: { code: "FORBIDDEN", message: "Not allowed" } },
              { status: 403 }
            )
          : Response.json({ items: [page({})] })
      )
    )
    renderPages()
    expect(
      await screen.findByText("The custom pages didn't load")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("table", { name: "Site pages" })
    ).toBeInTheDocument()
  })
})
