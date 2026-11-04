import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/careers",
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { JobsScreen } from "@/components/admin/careers/jobs-screen"
import { makeQueryClient } from "@/components/admin/providers"
import { AdminShell } from "@/components/admin/shell/admin-shell"
import type { Role } from "@/lib/auth/roles"
import type { JobListItem } from "@/lib/schemas/api/job-postings"

import { healthcareJob } from "../unit/helpers/job-fixture"

const ID = "00000000-0000-7000-8000-000000000001"
const item = (over: Partial<JobListItem> = {}): JobListItem => ({
  id: ID,
  slug: "cleaning-operative-healthcare",
  path: "/careers/cleaning-operative-healthcare",
  sortOrder: 0,
  title: healthcareJob.title,
  category: healthcareJob.category,
  location: healthcareJob.location,
  closedAt: null,
  open: true,
  version: 4,
  status: "published",
  dirty: false,
  publishedAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-01T09:00:00.000Z",
  updatedBy: null,
  ...over,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

let items: JobListItem[]
const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost")
    const method = init?.method ?? "GET"
    if (method === "GET" && url.pathname === "/api/v1/admin/job-postings")
      return json(200, { items, page: 1, pageSize: 20, total: items.length })
    if (method === "POST" && url.pathname.endsWith("/close"))
      return json(200, {
        ...item(),
        closedAt: "2026-11-04T10:00:00.000Z",
        open: false,
      })
    if (method === "POST" && url.pathname.endsWith("/reopen"))
      return json(200, item())
    return json(200, { items: [], page: 1, pageSize: 20, total: 0 })
  }
)

beforeEach(() => {
  push.mockReset()
  fetchMock.mockClear()
  items = [item()]
  vi.stubGlobal("fetch", fetchMock)
})

function renderWith(children: ReactNode, roles: Role[] = ["editor"]) {
  return render(
    <AdminShell
      queryClient={makeQueryClient()}
      session={{
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
      {children}
    </AdminShell>
  )
}

const calls = (pathEnd: string, method: string) =>
  fetchMock.mock.calls.filter(([input, init]) => {
    const url = new URL(String(input), "http://localhost")
    return url.pathname.endsWith(pathEnd) && (init?.method ?? "GET") === method
  })

describe("JobsScreen", () => {
  it("shows a job's category, location and Open status", async () => {
    renderWith(<JobsScreen />)
    const table = await screen.findByRole("table", { name: "Jobs" })
    const row = within(table).getByRole("row", {
      name: /Cleaning Operative – Healthcare/,
    })
    expect(within(row).getByText("Healthcare")).toBeInTheDocument()
    expect(within(row).getByText("Portlaoise, Co. Laois")).toBeInTheDocument()
    expect(within(row).getByText("Open")).toBeInTheDocument()
  })

  it("filters the list by Open, Closed and Drafts", async () => {
    renderWith(<JobsScreen />)
    await screen.findByRole("table", { name: "Jobs" })
    await userEvent.click(screen.getByRole("tab", { name: "Closed" }))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("status=closed")
        )
      ).toBe(true)
    )
    await userEvent.click(screen.getByRole("tab", { name: "Drafts" }))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("status=draft")
        )
      ).toBe(true)
    )
  })

  it("closes an open job with the row's version", async () => {
    renderWith(<JobsScreen />)
    const table = await screen.findByRole("table", { name: "Jobs" })
    await userEvent.click(
      within(table).getByRole("button", { name: /Close Cleaning Operative/ })
    )
    await waitFor(() => expect(calls("/close", "POST")).toHaveLength(1))
    expect(JSON.parse(String(calls("/close", "POST")[0][1]?.body))).toEqual({
      version: 4,
    })
  })

  it("reopens a closed job with the row's version", async () => {
    items = [
      item({ closedAt: "2026-11-04T10:00:00.000Z", open: false, version: 5 }),
    ]
    renderWith(<JobsScreen />)
    const table = await screen.findByRole("table", { name: "Jobs" })
    expect(within(table).getByText("Closed")).toBeInTheDocument()
    await userEvent.click(
      within(table).getByRole("button", { name: /Reopen Cleaning Operative/ })
    )
    await waitFor(() => expect(calls("/reopen", "POST")).toHaveLength(1))
    expect(JSON.parse(String(calls("/reopen", "POST")[0][1]?.body))).toEqual({
      version: 5,
    })
  })

  it("a viewer sees no Close button and no New job link", async () => {
    renderWith(<JobsScreen />, ["viewer"])
    const table = await screen.findByRole("table", { name: "Jobs" })
    expect(within(table).queryByRole("button", { name: /Close/ })).toBeNull()
    expect(screen.queryByRole("link", { name: "New job" })).toBeNull()
  })
})
