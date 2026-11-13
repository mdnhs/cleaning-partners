import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { pages, settings } from "@/server/db/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_careers_contact_placeholders.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const tel = { label: "(085) 806 2369", href: "tel:+353858062369" }
const mail = {
  label: "jobs@cleaningpartners.ie",
  href: "mailto:jobs@cleaningpartners.ie",
}
const telNew = { label: "{mobile}", href: "{mobileHref}" }
const mailNew = {
  label: "{recruitmentEmail}",
  href: "mailto:{recruitmentEmail}",
}
const callOld = { label: "Call (085) 806 2369", href: tel.href }
const callNew = { label: "Call {mobile}", href: "{mobileHref}" }

const careers = (overrides: { jobPhone?: unknown } = {}) => ({
  talentPool: { title: "T", call: callOld },
  job: { phone: overrides.jobPhone ?? tel, email: mail },
  apply: { sidebar: { phone: tel, email: mail } },
})
const contact = {
  phone24h: "1",
  email: "info@cleaningpartners.ie",
  mobile: "085 806 2369",
}

async function migrate() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}
const settingRow = async () =>
  (
    await getDb().select().from(settings).where(eq(settings.key, "contact"))
  )[0]
const pageRow = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "careers")))[0]
const insertPage = (draft: unknown, published: unknown) =>
  getDb()
    .insert(pages)
    .values({ key: "careers", template: "careers", draft, published })

beforeEach(resetDb)

describe("careers_contact_placeholders (custom data migration)", () => {
  it("backfills recruitmentEmail from the careers email, else contact.email", async () => {
    await getDb()
      .insert(settings)
      .values({ key: "contact", draft: contact, published: contact })
    await insertPage(careers(), careers())
    await migrate()
    const after = await settingRow()
    expect((after.draft as Record<string, unknown>).recruitmentEmail).toBe(
      "jobs@cleaningpartners.ie"
    )
    expect((after.published as Record<string, unknown>).recruitmentEmail).toBe(
      "jobs@cleaningpartners.ie"
    )
    expect((after.draft as Record<string, unknown>).mobile).toBe(
      "085 806 2369"
    )
  })

  it("falls back to contact.email when there is no careers row", async () => {
    await getDb()
      .insert(settings)
      .values({ key: "contact", draft: contact, published: contact })
    await migrate()
    const after = await settingRow()
    expect((after.draft as Record<string, unknown>).recruitmentEmail).toBe(
      "info@cleaningpartners.ie"
    )
    expect((after.published as Record<string, unknown>).recruitmentEmail).toBe(
      "info@cleaningpartners.ie"
    )
  })

  it("keeps a recruitmentEmail that is already set", async () => {
    const set = { ...contact, recruitmentEmail: "hr@example.ie" }
    await getDb()
      .insert(settings)
      .values({ key: "contact", draft: set, published: set })
    await insertPage(careers(), careers())
    await migrate()
    const after = await settingRow()
    expect((after.draft as Record<string, unknown>).recruitmentEmail).toBe(
      "hr@example.ie"
    )
  })

  it("replaces the seeded phone and email links with placeholders", async () => {
    await insertPage(careers(), careers())
    await migrate()
    const after = await pageRow()
    for (const data of [after.draft, after.published] as ReturnType<
      typeof careers
    >[]) {
      expect(data.talentPool.call).toEqual(callNew)
      expect(data.job.phone).toEqual(telNew)
      expect(data.job.email).toEqual(mailNew)
      expect(data.apply.sidebar.phone).toEqual(telNew)
      expect(data.apply.sidebar.email).toEqual(mailNew)
      expect(data.talentPool.title).toBe("T")
    }
  })

  it("leaves an admin-edited link alone", async () => {
    const edited = { label: "(085) 806 2369", href: "tel:+353000" }
    await insertPage(careers({ jobPhone: edited }), careers())
    await migrate()
    const after = await pageRow()
    const draft = after.draft as ReturnType<typeof careers>
    expect(draft.job.phone).toEqual(edited)
    expect(draft.job.email).toEqual(mailNew)
  })

  it("null published stays null; safe to re-run", async () => {
    await getDb()
      .insert(settings)
      .values({ key: "contact", draft: contact, published: null })
    await insertPage(careers(), null)
    await migrate()
    const once = [await settingRow(), await pageRow()]
    await migrate()
    const twice = [await settingRow(), await pageRow()]
    expect(twice[0].published).toBeNull()
    expect(twice[1].published).toBeNull()
    expect(twice[0].draft).toEqual(once[0].draft)
    expect(twice[1].draft).toEqual(once[1].draft)
    expect((twice[1].draft as ReturnType<typeof careers>).job.phone).toEqual(
      telNew
    )
  })
})
