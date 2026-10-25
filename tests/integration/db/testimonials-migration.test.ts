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
    await expect(insert(n)).rejects.toSatisfy(
      (e: { cause?: { code?: string; constraint?: string } }) =>
        e.cause?.code === "23514" &&
        e.cause?.constraint === "testimonials_rating_check"
    )
    const { rows } = await getDb().execute<{ c: number }>(
      sql`select count(*)::int as c from testimonials`
    )
    expect(rows[0].c).toBe(0)
  })

  it("rejects a duplicate name", async () => {
    await insert(5, "Same")
    await expect(insert(4, "Same")).rejects.toSatisfy(
      (e: { cause?: { code?: string; constraint?: string } }) =>
        e.cause?.code === "23505" &&
        e.cause?.constraint === "testimonials_name_unique"
    )
  })
})
