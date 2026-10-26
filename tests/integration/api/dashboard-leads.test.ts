import { beforeEach, describe, expect, it, vi } from "vitest"

// The dashboard's cached content readers (D3.5) run outside a "use cache"
// scope here: record nothing, compute directly.
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type { DashboardDto } from "@/lib/schemas/api/dashboard"
import { getDb } from "@/server/db/client"
import { leads } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
})

describe("dashboard uses real lead data (Phase 4)", () => {
  it("a public enquiry raises leads 30d / open leads and links Next up to the filtered inbox", async () => {
    const { cookie } = await signedInUser(["admin"])
    const before = (await (
      await adminRequest("/dashboard", { cookie })
    ).json()) as DashboardDto
    // The public form (POST /public/leads) arrives in Phase 7, which
    // restores SP's request here; until then the row is inserted directly.
    await getDb()
      .insert(leads)
      .values({ name: "Dash", email: "dash@example.ie", message: "Hi" })
    const after = (await (
      await adminRequest("/dashboard", { cookie })
    ).json()) as DashboardDto
    expect(after.kpis.leads30d!.value).toBe(
      (before.kpis.leads30d?.value ?? 0) + 1
    )
    expect(after.kpis.openLeads).toBe((before.kpis.openLeads ?? 0) + 1)
    expect(after.enquiriesWeek!.current).toBe(
      (before.enquiriesWeek?.current ?? 0) + 1
    )
    expect(after.nextUp.find((i) => i.id === "reply")?.title).toBe(
      "Reply to Dash"
    )
    expect(after.nextUp.find((i) => i.id === "unassigned-leads")?.href).toBe(
      "/admin/leads?status=new&assignee=none"
    )
  })
})
