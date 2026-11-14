import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { seoDefaultsSettings } from "@/lib/schemas/settings/seo-defaults"
import { getDb } from "@/server/db/client"
import { revisions, settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_seo_organization_currency.sql")
)
const statements = file
  ? readFileSync(join(DIR, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)
  : []

const seeded = settingsFixture(fixtureMediaLookup)["seo.defaults"]
type Seo = typeof seeded
type Organization = Seo["organization"]

/** seo.defaults as stored before 0037: organization without `currency`. */
const legacy = (organization: Partial<Organization> = {}): Seo => {
  const { currency, ...rest } = seeded.organization
  void currency
  return {
    ...seeded,
    organization: { ...rest, ...organization } as Organization,
  }
}
const currencyOf = (value: unknown) =>
  (value as Seo).organization.currency as string | undefined

async function migrate() {
  expect(file, "0037 migration file").toBeDefined()
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async () =>
  (
    await getDb()
      .select()
      .from(settings)
      .where(eq(settings.key, "seo.defaults"))
  )[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: "seo.defaults", draft, published })

beforeEach(resetDb)

describe("seo_organization_currency (custom data migration)", () => {
  it("adds EUR in draft and published", async () => {
    await insert(legacy(), legacy())
    await migrate()
    const after = await row()
    expect(currencyOf(after.draft)).toBe("EUR")
    expect(currencyOf(after.published)).toBe("EUR")
    expect(seoDefaultsSettings.parse(after.draft)).toEqual(
      seoDefaultsSettings.parse(seeded)
    )
    expect(seoDefaultsSettings.safeParse(after.published).success).toBe(true)
  })

  it("keeps a currency the admin already set", async () => {
    await insert(legacy({ currency: "GBP" }), legacy({ currency: "GBP" }))
    await migrate()
    const after = await row()
    expect(currencyOf(after.draft)).toBe("GBP")
    expect(currencyOf(after.published)).toBe("GBP")
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(legacy(), null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect(seoDefaultsSettings.safeParse(twice.draft).success).toBe(true)
  })

  it("adds the key to seo.defaults revisions only (restore keeps working)", async () => {
    await insert(legacy(), legacy())
    const other = { organization: { name: "x" } }
    await getDb()
      .insert(revisions)
      .values([
        {
          entityType: "settings",
          entityId: "seo.defaults",
          version: 1,
          data: legacy(),
        },
        {
          entityType: "settings",
          entityId: "seo.defaults",
          version: 2,
          data: legacy({ currency: "GBP" }),
        },
        { entityType: "settings", entityId: "site", version: 1, data: other },
      ])
    await migrate()
    const seo = await getDb()
      .select()
      .from(revisions)
      .where(
        and(
          eq(revisions.entityType, "settings"),
          eq(revisions.entityId, "seo.defaults")
        )
      )
      .orderBy(revisions.version)
    expect(seo.map((r) => currencyOf(r.data))).toEqual(["EUR", "GBP"])
    for (const r of seo)
      expect(seoDefaultsSettings.safeParse(r.data).success).toBe(true)
    const [site] = await getDb()
      .select()
      .from(revisions)
      .where(eq(revisions.entityId, "site"))
    expect(site.data).toEqual(other)
  })
})
