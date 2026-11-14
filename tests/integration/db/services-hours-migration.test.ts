import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { pages } from "@/server/db/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_services_office_hours_placeholder.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const services = (hours: string) => ({
  detail: { officeHours: { title: "Office Hours", hours } },
})
const SEEDED = "Mon – Fri: 9am – 6pm"

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}
const row = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "services")))[0]
const hoursOf = (data: unknown) =>
  (data as ReturnType<typeof services>).detail.officeHours.hours
const insert = (draft: unknown, published: unknown) =>
  getDb()
    .insert(pages)
    .values({ key: "services", template: "services", draft, published })

beforeEach(resetDb)

describe("services_office_hours_placeholder (custom data migration)", () => {
  it("replaces the seeded hours with {hours} in draft and published", async () => {
    await insert(services(SEEDED), services(SEEDED))
    await migrate()
    const after = await row()
    expect(hoursOf(after.draft)).toBe("{hours}")
    expect(hoursOf(after.published)).toBe("{hours}")
  })

  it("leaves admin-edited hours alone in each column", async () => {
    await insert(services("Open daily"), services(SEEDED))
    await migrate()
    const after = await row()
    expect(hoursOf(after.draft)).toBe("Open daily")
    expect(hoursOf(after.published)).toBe("{hours}")
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(services(SEEDED), null)
    await migrate()
    await migrate()
    const after = await row()
    expect(after.published).toBeNull()
    expect(hoursOf(after.draft)).toBe("{hours}")
  })
})
