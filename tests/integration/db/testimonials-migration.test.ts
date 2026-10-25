import { readdirSync } from "node:fs"

import { sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { testimonials } from "@/server/db/schema"

import { resetDb } from "../db"

const insert = (rating: number, name = `T${rating}`) =>
  getDb()
    .insert(testimonials)
    .values({ name, initials: "T", quote: "Great", rating })

describe("migration 0021 testimonials", () => {
  beforeEach(resetDb)

  it("ships a 0021 migration", () => {
    expect(
      readdirSync("server/db/migrations").some((f) => f.startsWith("0021_"))
    ).toBe(true)
  })

  it("applies the table with rating default 5", async () => {
    const [row] = await getDb()
      .insert(testimonials)
      .values({ name: "A", initials: "A", quote: "q" })
      .returning()
    expect(row.rating).toBe(5)
    expect(row.sortOrder).toBe(0)
  })

  it("accepts ratings 1 and 5", async () => {
    await expect(insert(1)).resolves.toBeDefined()
    await expect(insert(5)).resolves.toBeDefined()
  })

  it.each([0, 6])("rejects rating %i via the check constraint", async (n) => {
    await expect(insert(n)).rejects.toThrow()
    const { rows } = await getDb().execute<{ c: number }>(
      sql`select count(*)::int as c from testimonials`
    )
    expect(rows[0].c).toBe(0)
  })
})
