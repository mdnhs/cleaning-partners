import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type { ServiceDto } from "@/lib/schemas/api/services"
import { getDb } from "@/server/db/client"
import { services } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
})

describe("R5-3: paragraphsText fields never store a lead variant", () => {
  it("a service overview sent with variant: lead is saved without it", async () => {
    const { cookie } = await signedInUser(["editor"])
    const [row] = await getDb()
      .select()
      .from(services)
      .where(eq(services.slug, "medical-cleaning"))
    const draft = structuredClone(row.draft) as {
      overview: { content: Record<string, unknown>[] }
    }
    draft.overview.content[0] = {
      ...draft.overview.content[0],
      attrs: { variant: "lead" },
    }
    const res = await adminRequest(`/services/${row.id}/draft`, {
      cookie,
      method: "PUT",
      json: { draft, version: row.version },
    })
    expect(res.status).toBe(200)
    const dto = (await res.json()) as ServiceDto
    expect(
      JSON.stringify((dto.draft as { overview: unknown }).overview)
    ).not.toContain("variant")
    const [stored] = await getDb()
      .select()
      .from(services)
      .where(eq(services.id, row.id))
    expect(JSON.stringify(stored.draft)).not.toContain('"variant"')
  })
})
