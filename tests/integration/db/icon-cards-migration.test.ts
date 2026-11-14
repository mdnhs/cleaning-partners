import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { settingsSchemas } from "@/lib/schemas/settings"
import { whyChooseUsSettings } from "@/lib/schemas/settings/sections-why-choose-us"
import { getDb } from "@/server/db/client"
import { media, mediaUsages, revisions, settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const KEY = "sections.whyChooseUs"
const file = readdirSync(DIR).find((f) => f.endsWith("_icon_cards_section.sql"))
const statements = file
  ? readFileSync(join(DIR, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)
  : []

type Obj = Record<string, unknown>
const seeded = settingsFixture(fixtureMediaLookup)[KEY]

/** sections.whyChooseUs as stored before 0042: the cards are `features`. */
const legacy = (features: unknown = seeded.cards) => {
  const { cards, ...rest } = seeded
  void cards
  return { ...rest, features }
}
const edited = [
  { ...seeded.cards[3], title: "Timely (edited)" },
  seeded.cards[0],
]

async function migrate() {
  expect(file, "0042 migration file").toBeDefined()
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async () =>
  (await getDb().select().from(settings).where(eq(settings.key, KEY)))[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: KEY, draft, published })

beforeEach(resetDb)

describe("icon_cards_section (custom data migration)", () => {
  it("renames features to cards in draft and published, values and order kept", async () => {
    await insert(legacy(), legacy(edited))
    await migrate()
    const after = await row()
    const draft = after.draft as Obj
    const published = after.published as Obj
    expect(draft).not.toHaveProperty("features")
    expect(published).not.toHaveProperty("features")
    expect(draft.cards).toEqual(seeded.cards)
    expect(published.cards).toEqual(edited)
    expect(whyChooseUsSettings.parse(draft)).toEqual(
      whyChooseUsSettings.parse(seeded)
    )
    expect(settingsSchemas[KEY].safeParse(published).success).toBe(true)
  })

  it("leaves a row already on cards untouched", async () => {
    const both = { ...seeded, features: edited }
    await insert(seeded, both)
    await migrate()
    const after = await row()
    expect(after.draft).toEqual(seeded)
    expect(after.published).toEqual(both)
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(legacy(edited), null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect((twice.draft as Obj).cards).toEqual(edited)
    expect(whyChooseUsSettings.safeParse(twice.draft).success).toBe(true)
  })

  it("renames the list in sections.whyChooseUs revisions only", async () => {
    await insert(legacy(), legacy())
    const other = { features: [{ title: "x" }] }
    await getDb()
      .insert(revisions)
      .values([
        { entityType: "settings", entityId: KEY, version: 1, data: legacy() },
        {
          entityType: "settings",
          entityId: KEY,
          version: 2,
          data: legacy(edited),
        },
        { entityType: "settings", entityId: "site", version: 1, data: other },
      ])
    await migrate()
    const why = await getDb()
      .select()
      .from(revisions)
      .where(
        and(eq(revisions.entityType, "settings"), eq(revisions.entityId, KEY))
      )
      .orderBy(revisions.version)
    expect(why.map((r) => (r.data as Obj).cards)).toEqual([
      seeded.cards,
      edited,
    ])
    for (const r of why) {
      expect(r.data).not.toHaveProperty("features")
      expect(whyChooseUsSettings.safeParse(r.data).success).toBe(true)
    }
    const [site] = await getDb()
      .select()
      .from(revisions)
      .where(eq(revisions.entityId, "site"))
    expect(site.data).toEqual(other)
  })

  it("renames the media usages of the cards", async () => {
    const db = getDb()
    const ids = [
      "6f1c0a52-8d0e-4c1b-9a51-2b7f3e1a0001",
      "6f1c0a52-8d0e-4c1b-9a51-2b7f3e1a0002",
      "6f1c0a52-8d0e-4c1b-9a51-2b7f3e1a0003",
    ]
    await db.insert(media).values(
      ids.map((id, i) => ({
        id,
        key: `/images/icon-cards-${i}.png`,
        driver: "static" as const,
        mime: "image/png",
        size: 1,
      }))
    )
    const [A, B, C] = ids as [string, string, string]
    const usage = (entityId: string, field: string, mediaId: string) => ({
      mediaId,
      entityType: "settings",
      entityId,
      field,
    })
    await db.insert(mediaUsages).values([
      usage(KEY, "features.0.icon", A),
      usage(KEY, "features.3.icon", B),
      usage(KEY, "background", C),
      // Already renamed elsewhere: the old row goes, the new one stays.
      usage(KEY, "features.1.icon", C),
      usage(KEY, "cards.1.icon", C),
      usage("sections.contact", "features.0.icon", A),
      { ...usage(KEY, "features.2.icon", A), entityType: "page" },
    ])
    await migrate()
    const rows = await db
      .select({
        mediaId: mediaUsages.mediaId,
        entityType: mediaUsages.entityType,
        entityId: mediaUsages.entityId,
        field: mediaUsages.field,
      })
      .from(mediaUsages)
    expect(
      rows
        .map((u) => `${u.entityType}:${u.entityId}:${u.field}:${u.mediaId}`)
        .sort()
    ).toEqual(
      [
        `settings:${KEY}:cards.0.icon:${A}`,
        `settings:${KEY}:cards.3.icon:${B}`,
        `settings:${KEY}:background:${C}`,
        `settings:${KEY}:cards.1.icon:${C}`,
        `settings:sections.contact:features.0.icon:${A}`,
        `page:${KEY}:features.2.icon:${A}`,
      ].sort()
    )
  })
})
