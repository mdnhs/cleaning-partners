import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/careers/applications",
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { ApplicationDetail } from "@/components/admin/careers/application-detail"
import { ApplicationsScreen } from "@/components/admin/careers/applications-screen"
import { makeQueryClient } from "@/components/admin/providers"
import { AdminShell } from "@/components/admin/shell/admin-shell"
import type { Role } from "@/lib/auth/roles"
import type {
  ApplicationDto,
  ApplicationListItem,
} from "@/lib/schemas/api/applications"

const ID = "00000000-0000-7000-8000-0000000000a1"
const item: ApplicationListItem = {
  id: ID,
  name: "Mary Kelly",
  email: "mary@example.com",
  phone: "085 000 0000",
  town: "Portlaoise",
  jobId: "00000000-0000-7000-8000-000000000001",
  jobTitle: "Cleaning Operative – Healthcare",
  jobReference: "CP-2611-HC",
  status: "new",
  assignee: null,
  hasCv: true,
  createdAt: "2026-11-04T10:00:00.000Z",
}
const dto: ApplicationDto = {
  ...item,
  firstName: "Mary",
  surname: "Kelly",
  address: null,
  eircode: null,
  answers: {
    rightToWork: "Irish or UK citizen",
    permissionExpiry: null,
    gardaVetting: true,
    livedAbroad: false,
    startDate: "2026-12-01",
    hoursPerWeek: "20–30 hours",
    shifts: ["Weekends"],
    transport: true,
    experience: "1–2 years",
    healthcareExperience: null,
    recentRole: null,
    certificates: [],
  },
  note: "Mornings suit me best.",
  heardAbout: null,
  declaration: true,
  privacyConsent: true,
  keepOnFile: true,
  sourcePage: "/careers/cleaning-operative-healthcare/apply",
  cv: { name: "Mary Kelly CV.pdf", mime: "application/pdf", size: 20_480 },
  updatedAt: "2026-11-04T10:00:00.000Z",
  events: [],
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost")
    const method = init?.method ?? "GET"
    if (url.pathname === "/api/v1/admin/applications")
      return json(200, { items: [item], page: 1, pageSize: 20, total: 1 })
    if (url.pathname === `/api/v1/admin/applications/${ID}` && method === "GET")
      return json(200, dto)
    if (url.pathname === `/api/v1/admin/applications/${ID}` && method === "PATCH")
      return json(200, { ...dto, status: "shortlisted" })
    return json(200, { items: [], page: 1, pageSize: 20, total: 0 })
  }
)

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal("fetch", fetchMock)
})

function renderWith(children: ReactNode, roles: Role[] = ["intake"]) {
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

describe("ApplicationsScreen", () => {
  it("lists open applications with the job, status and CV; enquiry staff see no job filter", async () => {
    renderWith(<ApplicationsScreen />)
    const table = await screen.findByRole("table", { name: "Applications" })
    const row = within(table).getByRole("row", { name: /Mary Kelly/ })
    expect(
      within(row).getByText("Cleaning Operative – Healthcare")
    ).toBeInTheDocument()
    expect(within(row).getByText("New")).toBeInTheDocument()
    expect(within(row).getByLabelText("CV attached")).toBeInTheDocument()
    expect(within(row).getByRole("link", { name: "Mary Kelly" })).toHaveAttribute(
      "href",
      `/admin/careers/applications/${ID}`
    )
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("status=open")
      )
    ).toBe(true)
    // intake has no job:read: no job list is fetched, no job filter shown.
    expect(screen.queryByLabelText("Job")).toBeNull()
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/job-postings")
      )
    ).toBe(false)
  })
})

describe("ApplicationDetail", () => {
  it("shows the answers and a private CV download link, and saves a status change", async () => {
    renderWith(<ApplicationDetail id={ID} />)
    expect(
      await screen.findByRole("heading", { name: "Mary Kelly" })
    ).toBeInTheDocument()
    expect(screen.getByText("Mornings suit me best.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Download CV/ })).toHaveAttribute(
      "href",
      `/api/v1/admin/applications/${ID}/cv`
    )
    // intake may not delete.
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull()

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Shortlisted" })
    )
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).endsWith(`/applications/${ID}`) &&
            init?.method === "PATCH" &&
            String(init.body).includes("shortlisted")
        )
      ).toBe(true)
    )
  })
})
