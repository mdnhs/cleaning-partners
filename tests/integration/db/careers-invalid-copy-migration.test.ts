import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { pages, revisions } from "@/server/db/schema"
import { careersPageFixture } from "@/server/db/seed/fixtures/careers"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { careersTemplate } from "@/templates/careers/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_careers_invalid_answer_copy.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const seeded = careersPageFixture(fixtureMediaLookup).data
type Careers = typeof seeded
type Errors = Careers["apply"]["errors"]

/** The careers page as stored before 0036: apply.errors without `invalid`. */
const legacy = (errors: Partial<Errors> = {}): Careers => {
  const { invalid, ...rest } = seeded.apply.errors
  void invalid
  return {
    ...seeded,
    apply: { ...seeded.apply, errors: { ...rest, ...errors } as Errors },
  }
}
const invalidOf = (value: unknown) =>
  (value as Careers).apply.errors.invalid as string | undefined

async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "careers")))[0]
const insert = (draft: unknown, published: unknown) =>
  getDb()
    .insert(pages)
    .values({ key: "careers", template: "careers", draft, published })

beforeEach(resetDb)

describe("careers_invalid_answer_copy (custom data migration)", () => {
  it("adds the seeded copy in draft and published", async () => {
    await insert(legacy(), legacy())
    await migrate()
    const after = await row()
    expect(invalidOf(after.draft)).toBe("Please check this answer.")
    expect(invalidOf(after.published)).toBe("Please check this answer.")
    expect(careersTemplate.parse(after.draft)).toEqual(
      careersTemplate.parse(seeded)
    )
    expect(careersTemplate.safeParse(after.published).success).toBe(true)
  })

  it("keeps a value the admin already set", async () => {
    await insert(
      legacy({ invalid: "That answer won't do." }),
      legacy({ invalid: "That answer won't do." })
    )
    await migrate()
    const after = await row()
    expect(invalidOf(after.draft)).toBe("That answer won't do.")
    expect(invalidOf(after.published)).toBe("That answer won't do.")
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(legacy(), null)
    await migrate()
    const once = await row()
    await migrate()
    const twice = await row()
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect(careersTemplate.safeParse(twice.draft).success).toBe(true)
  })

  it("adds the key to careers page revisions only", async () => {
    await insert(legacy(), legacy())
    const other = { apply: { errors: { required: "x" } } }
    await getDb()
      .insert(revisions)
      .values([
        { entityType: "page", entityId: "careers", version: 1, data: legacy() },
        { entityType: "page", entityId: "contact", version: 1, data: other },
      ])
    await migrate()
    const [careers] = await getDb()
      .select()
      .from(revisions)
      .where(
        and(eq(revisions.entityType, "page"), eq(revisions.entityId, "careers"))
      )
    expect(invalidOf(careers.data)).toBe("Please check this answer.")
    expect(careersTemplate.safeParse(careers.data).success).toBe(true)
    const [contact] = await getDb()
      .select()
      .from(revisions)
      .where(eq(revisions.entityId, "contact"))
    expect(contact.data).toEqual(other)
  })
})
