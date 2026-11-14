import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) => f.endsWith("_footer_login_link.sql"))!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const LOGIN = { label: "Login", href: "/admin/sign-in" }
const base = { tagline: "T", copyright: "C" }

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}
const row = async () =>
  (await getDb().select().from(settings).where(eq(settings.key, "footer")))[0]
const insert = (draft: unknown, published: unknown) =>
  getDb().insert(settings).values({ key: "footer", draft, published })

beforeEach(resetDb)

describe("footer_login_link (custom data migration)", () => {
  it("adds the seeded link when the key is missing, in draft and published", async () => {
    await insert(base, base)
    await migrate()
    const after = await row()
    expect(after.draft).toEqual({ ...base, loginLink: LOGIN })
    expect(after.published).toEqual({ ...base, loginLink: LOGIN })
  })

  it("keeps an existing value and an explicit null (hidden)", async () => {
    const custom = { label: "Staff", href: "/staff" }
    await insert({ ...base, loginLink: custom }, { ...base, loginLink: null })
    await migrate()
    const after = await row()
    expect(after.draft).toEqual({ ...base, loginLink: custom })
    expect(after.published).toEqual({ ...base, loginLink: null })
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert(base, null)
    await migrate()
    await migrate()
    const after = await row()
    expect(after.published).toBeNull()
    expect(after.draft).toEqual({ ...base, loginLink: LOGIN })
  })
})
