import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { footerSettings } from "@/lib/schemas/settings/footer"
import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_footer_address_from_contact.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

// The footer as stored before 0040: today's seed plus its own second line.
const seeded = settingsFixture(fixtureMediaLookup).footer
const before = { ...seeded, addressLine2: "Co. Laois, R32 YX49" }

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}
const row = async (key = "footer") =>
  (await getDb().select().from(settings).where(eq(settings.key, key)))[0]
const insert = (key: string, draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key, draft, published })

beforeEach(resetDb)

describe("footer_address_from_contact (custom data migration)", () => {
  it("drops addressLine2 from draft and published, keeping every other key", async () => {
    await insert("footer", before, before)
    await migrate()
    const after = await row()
    expect(after.draft).toEqual(seeded)
    expect(after.published).toEqual(seeded)
    expect(after.draft).not.toHaveProperty("addressLine2")
    expect(footerSettings.parse(after.draft)).toEqual(seeded)
    expect(footerSettings.parse(after.published)).toEqual(seeded)
  })

  it("keeps the admin's edits, including an edited address line", async () => {
    const edited = { ...before, tagline: "Edited", addressLine2: "Custom" }
    await insert("footer", edited, edited)
    await migrate()
    const after = await row()
    // The edited wording stays in the row (recoverable); reads strip it.
    expect(after.draft).toEqual(edited)
    expect(after.published).toEqual(edited)
    const parsed = { ...seeded, tagline: "Edited" }
    expect(footerSettings.parse(after.draft)).toEqual(parsed)
    expect(footerSettings.parse(after.published)).toEqual(parsed)
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert("footer", before, null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(seeded)
    expect(twice).toEqual(once)
  })

  it("leaves Settings › Contact's addressLine2 alone", async () => {
    const contact = { addressLine1: "A", addressLine2: "B" }
    await insert("contact", contact, contact)
    await migrate()
    const after = await row("contact")
    expect(after.draft).toEqual(contact)
    expect(after.published).toEqual(contact)
  })
})
