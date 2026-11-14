import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { settingsSchemas } from "@/lib/schemas/settings"
import { getDb } from "@/server/db/client"
import { revisions, settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_contact_info_card_kinds.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const KEY = "sections.contact"
const schema = settingsSchemas[KEY]
const seeded = settingsFixture(fixtureMediaLookup)[KEY]

type Card = Record<string, unknown>
/** sections.contact as stored before 0035: cards without `kind`. */
const legacy = (cards?: Card[]) => ({
  ...seeded,
  infoCards:
    cards ??
    seeded.infoCards.map((card) => {
      const { kind, ...rest } = card
      void kind
      return rest
    }),
})
const kinds = (value: unknown) =>
  (value as { infoCards: Card[] }).infoCards.map((card) => card.kind)

/** One transaction = one connection, so the pg_temp helper stays visible. */
async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async () =>
  (await getDb().select().from(settings).where(eq(settings.key, KEY)))[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: KEY, draft, published })

beforeEach(resetDb)

describe("contact_info_card_kinds (custom data migration)", () => {
  it("gives the seeded cards their kind by title, in draft and published", async () => {
    await insert(legacy(), legacy())
    await migrate()
    const after = await row()
    const expected = ["phone", "email", "address", "hours"]
    expect(kinds(after.draft)).toEqual(expected)
    expect(kinds(after.published)).toEqual(expected)
    expect(schema.parse(after.draft)).toEqual(seeded)
    expect(schema.parse(after.published)).toEqual(seeded)
  })

  it("renamed cards get a kind by position; an existing kind is kept", async () => {
    const [phone, email, address, hours] = legacy().infoCards
    const cards = [
      { ...phone, title: "Call us" },
      { ...email, title: "Write" },
      { ...address, title: "Find us" },
      { ...hours, title: "When" },
      { ...hours, title: "Extra", kind: "other" },
    ]
    const kept = [{ ...address, title: "Phone", kind: "other" }, ...cards]
    await insert(legacy(cards), legacy(kept))
    await migrate()
    const after = await row()
    expect(kinds(after.draft)).toEqual([
      "phone",
      "email",
      "address",
      "other",
      "other",
    ])
    // A card that already has a kind keeps it, whatever its title; the
    // others fall back to their own title or position.
    expect(kinds(after.published)).toEqual([
      "other",
      "email",
      "address",
      "other",
      "other",
      "other",
    ])
    expect(schema.safeParse(after.draft).success).toBe(true)
    expect(schema.safeParse(after.published).success).toBe(true)
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(legacy(), null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect(schema.parse(twice.draft)).toEqual(seeded)
  })

  it("adds kinds to sections.contact revisions only", async () => {
    await insert(legacy(), legacy())
    await getDb()
      .insert(revisions)
      .values([
        { entityType: "settings", entityId: KEY, version: 1, data: legacy() },
        {
          entityType: "settings",
          entityId: "footer",
          version: 1,
          data: { infoCards: [{ title: "Phone" }] },
        },
      ])
    await migrate()
    const [contact] = await getDb()
      .select()
      .from(revisions)
      .where(
        and(eq(revisions.entityType, "settings"), eq(revisions.entityId, KEY))
      )
    expect(schema.parse(contact.data)).toEqual(seeded)
    const [footer] = await getDb()
      .select()
      .from(revisions)
      .where(eq(revisions.entityId, "footer"))
    expect(footer.data).toEqual({ infoCards: [{ title: "Phone" }] })
  })
})
