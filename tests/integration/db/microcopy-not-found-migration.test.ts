import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_microcopy_not_found.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const NOT_FOUND = {
  crumb: "Not found",
  title: "Page not found",
  description: "The page you are looking for has moved or no longer exists.",
  homeLabel: "Back to home",
}
const base = { readArticle: "Read article", breadcrumbAria: "Breadcrumb" }

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}
const row = async () =>
  (
    await getDb()
      .select()
      .from(settings)
      .where(eq(settings.key, "microcopy"))
  )[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: "microcopy", draft, published })

beforeEach(resetDb)

describe("microcopy_not_found (custom data migration)", () => {
  it("adds the seeded 404 copy when the key is missing, in draft and published", async () => {
    await insert(base, base)
    await migrate()
    const after = await row()
    expect(after.draft).toEqual({ ...base, notFound: NOT_FOUND })
    expect(after.published).toEqual({ ...base, notFound: NOT_FOUND })
  })

  it("keeps copy the admin already set", async () => {
    const custom = { ...NOT_FOUND, title: "Oops" }
    await insert({ ...base, notFound: custom }, { ...base, notFound: custom })
    await migrate()
    const after = await row()
    expect(after.draft).toEqual({ ...base, notFound: custom })
    expect(after.published).toEqual({ ...base, notFound: custom })
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(base, null)
    await migrate()
    await migrate()
    const after = await row()
    expect(after.published).toBeNull()
    expect(after.draft).toEqual({ ...base, notFound: NOT_FOUND })
  })
})
