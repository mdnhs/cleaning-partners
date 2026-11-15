import { readFileSync } from "node:fs"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { seoDefaultsSettings } from "@/lib/schemas/settings/seo-defaults"
import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"

import { resetDb } from "../db"

const statements = [
  "server/db/migrations/0048_seo_defaults_local_search.sql",
  "server/db/migrations/0049_seo_defaults_preferred_host.sql",
].flatMap((file) =>
  readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)
)

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}

/** seo.defaults as stored before 0048. */
function legacy() {
  const value = structuredClone(
    fixtureSiteSources().settings["seo.defaults"]
  ) as Record<string, unknown>
  delete value.twitterHandle
  delete value.llms
  delete value.preferredHost
  const org = value.organization as Record<string, unknown>
  for (const key of [
    "priceRange",
    "otherAreas",
    "latitude",
    "longitude",
    "ratingValue",
    "reviewCount",
  ])
    delete org[key]
  return value
}

beforeEach(resetDb)

describe("0048_seo_defaults_local_search + 0049_seo_defaults_preferred_host", () => {
  it("adds the new keys to both copies, keeps what is there, and re-runs safely", async () => {
    const draft = legacy()
    draft.twitterHandle = "@cp_ie"
    ;(draft.organization as Record<string, unknown>).areaServed = "Leinster"
    await getDb()
      .insert(settings)
      .values({ key: "seo.defaults", draft, published: legacy(), version: 4 })
      .onConflictDoUpdate({
        target: settings.key,
        set: { draft, published: legacy(), version: 4 },
      })
    await migrate()
    await migrate()
    const [row] = await getDb()
      .select()
      .from(settings)
      .where(eq(settings.key, "seo.defaults"))
    const published = row.published as Record<string, unknown>
    expect(published.preferredHost).toBe("off")
    expect(published.twitterHandle).toBe("")
    expect(published.llms).toEqual({ enabled: true, summary: "" })
    expect(published.organization).toMatchObject({
      priceRange: "",
      otherAreas: [],
      latitude: "",
      longitude: "",
      ratingValue: "",
      reviewCount: "",
      areaServed: "Ireland",
    })
    const parsedDraft = seoDefaultsSettings.parse(row.draft)
    expect(parsedDraft.twitterHandle).toBe("@cp_ie")
    expect(parsedDraft.organization.areaServed).toBe("Leinster")
    expect(seoDefaultsSettings.safeParse(row.published).success).toBe(true)
    expect(row.version).toBe(4)
  })

  it("leaves an unpublished row's published value null", async () => {
    await getDb()
      .insert(settings)
      .values({ key: "seo.defaults", draft: legacy(), published: null })
      .onConflictDoUpdate({
        target: settings.key,
        set: { draft: legacy(), published: null },
      })
    await migrate()
    const [row] = await getDb()
      .select()
      .from(settings)
      .where(eq(settings.key, "seo.defaults"))
    expect(row.published).toBeNull()
    expect(seoDefaultsSettings.safeParse(row.draft).success).toBe(true)
  })
})
