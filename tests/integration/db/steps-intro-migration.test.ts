import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { howItWorksSettings } from "@/lib/schemas/settings/sections-how-it-works"
import { getDb } from "@/server/db/client"
import { revisions, settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const KEY = "sections.howItWorks"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_steps_section_intro.sql")
)
const statements = file
  ? readFileSync(join(DIR, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)
  : []

const seeded = settingsFixture(fixtureMediaLookup)[KEY]

/** sections.howItWorks as stored before 0041: no `intro` key. */
const legacy = () => {
  const { intro, ...rest } = seeded
  void intro
  return rest
}
const withIntro = (intro: string) => ({ ...legacy(), intro })
const introOf = (value: unknown) => (value as Record<string, unknown>).intro

async function migrate() {
  expect(file, "0041 migration file").toBeDefined()
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async () =>
  (await getDb().select().from(settings).where(eq(settings.key, KEY)))[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: KEY, draft, published })

beforeEach(resetDb)

describe("steps_section_intro (custom data migration)", () => {
  it("adds intro: null in draft and published", async () => {
    await insert(legacy(), legacy())
    await migrate()
    const after = await row()
    expect(after.draft).toHaveProperty("intro", null)
    expect(after.published).toHaveProperty("intro", null)
    expect(howItWorksSettings.parse(after.draft)).toEqual(
      howItWorksSettings.parse(seeded)
    )
    expect(howItWorksSettings.parse(after.published)).toEqual(
      howItWorksSettings.parse(seeded)
    )
  })

  it("keeps an intro the admin already set", async () => {
    await insert(withIntro("Draft intro."), withIntro("Live intro."))
    await migrate()
    const after = await row()
    expect(introOf(after.draft)).toBe("Draft intro.")
    expect(introOf(after.published)).toBe("Live intro.")
    expect(howItWorksSettings.safeParse(after.draft).success).toBe(true)
    expect(howItWorksSettings.safeParse(after.published).success).toBe(true)
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(legacy(), null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect(howItWorksSettings.safeParse(twice.draft).success).toBe(true)
  })

  it("adds the key to sections.howItWorks revisions only (restore keeps working)", async () => {
    await insert(legacy(), legacy())
    const other = { eyebrow: "x" }
    await getDb()
      .insert(revisions)
      .values([
        { entityType: "settings", entityId: KEY, version: 1, data: legacy() },
        {
          entityType: "settings",
          entityId: KEY,
          version: 2,
          data: withIntro("Kept."),
        },
        { entityType: "settings", entityId: "site", version: 1, data: other },
      ])
    await migrate()
    const steps = await getDb()
      .select()
      .from(revisions)
      .where(
        and(eq(revisions.entityType, "settings"), eq(revisions.entityId, KEY))
      )
      .orderBy(revisions.version)
    expect(steps.map((r) => introOf(r.data))).toEqual([null, "Kept."])
    for (const r of steps)
      expect(howItWorksSettings.safeParse(r.data).success).toBe(true)
    const [site] = await getDb()
      .select()
      .from(revisions)
      .where(eq(revisions.entityId, "site"))
    expect(site.data).toEqual(other)
  })
})
