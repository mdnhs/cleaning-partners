import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { getDb } from "@/server/db/client"
import { pages, revisions } from "@/server/db/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_quote_form_feedback.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const OLD_SENT =
  "Your email app should open with your request. If it doesn't, email us at {email}."
const NEW_SENT =
  "Thanks, we've received your request and will be in touch shortly. You can also email us at {email}."
const FEEDBACK = {
  sendingLabel: "Sending…",
  errorMessage: "Something went wrong. Please try again, or call us.",
  rateLimitedMessage: "Too many attempts. Please try again in a few minutes.",
}

const FIELD_ERRORS = {
  name: "Please enter your name.",
  phone: "Please enter a phone number we can reach you on.",
  email: "Please enter a valid email address.",
  service: "Please choose a service from the list.",
  address: "Please check your address or Eircode.",
  message: "Please shorten your message.",
  consent: "Please agree to be contacted so we can reply.",
}

const oldFields = () =>
  Object.fromEntries(
    Object.keys(FIELD_ERRORS).map((k) => [k, { label: `${k} label` }])
  )

const oldData = (quoteForm: Record<string, unknown> = {}) => ({
  contactTitle: "Ways to Reach Us",
  quoteForm: {
    submitLabel: "Send Request",
    sentMessage: OLD_SENT,
    fields: oldFields(),
    ...quoteForm,
  },
})

const errorsOf = (data: Data) =>
  Object.fromEntries(
    Object.keys(FIELD_ERRORS).map((k) => [
      k,
      (data.quoteForm.fields as unknown as Record<string, { error?: string }>)[
        k
      ].error,
    ])
  )

type Data = {
  contactTitle: string
  quoteForm: Record<string, string> & { fields: Record<string, unknown> }
}

beforeEach(async () => {
  await resetDb()
})

async function run() {
  for (const statement of statements) await getDb().execute(sql.raw(statement))
}

describe("0024_quote_form_feedback (custom data migration)", () => {
  it("adds the copy to draft, published and revisions and reseeds the old mailto sentMessage", async () => {
    const db = getDb()
    await db.insert(pages).values({
      key: "contact",
      template: "contact",
      draft: oldData(),
      published: oldData(),
      version: 2,
    })
    await db.insert(revisions).values({
      entityType: "page",
      entityId: "contact",
      version: 1,
      data: oldData(),
    })
    await run()

    const [row] = await db.select().from(pages).where(eq(pages.key, "contact"))
    for (const data of [row.draft, row.published] as Data[]) {
      expect(data.contactTitle).toBe("Ways to Reach Us")
      expect(data.quoteForm).toMatchObject({
        submitLabel: "Send Request",
        sentMessage: NEW_SENT,
        ...FEEDBACK,
      })
      expect(errorsOf(data)).toEqual(FIELD_ERRORS)
      expect(data.quoteForm.fields.name).toEqual({
        label: "name label",
        error: FIELD_ERRORS.name,
      })
    }
    const [revision] = await db.select().from(revisions)
    expect((revision.data as Data).quoteForm).toMatchObject({
      sentMessage: NEW_SENT,
      ...FEEDBACK,
    })
    expect(errorsOf(revision.data as Data)).toEqual(FIELD_ERRORS)
  })

  it("never overwrites an edit", async () => {
    const fields = oldFields() as Record<string, Record<string, string>>
    fields.phone.error = "Owner phone error"
    const edited = oldData({
      sentMessage: "Edited by the owner, write to {email}.",
      errorMessage: "Owner error copy",
      fields,
    })
    await getDb().insert(pages).values({
      key: "contact",
      template: "contact",
      draft: edited,
      published: edited,
      version: 2,
    })
    await run()
    const [row] = await getDb().select().from(pages)
    const published = row.published as Data
    expect(published.quoteForm.sentMessage).toBe(
      "Edited by the owner, write to {email}."
    )
    expect(published.quoteForm.errorMessage).toBe("Owner error copy")
    expect(published.quoteForm.sendingLabel).toBe("Sending…")
    expect(errorsOf(published)).toEqual({
      ...FIELD_ERRORS,
      phone: "Owner phone error",
    })
    expect(published.quoteForm.rateLimitedMessage).toBe(
      FEEDBACK.rateLimitedMessage
    )
  })

  it("keeps an unpublished page unpublished and leaves other pages alone", async () => {
    const db = getDb()
    await db.insert(pages).values([
      {
        key: "contact",
        template: "contact",
        draft: oldData(),
        published: null,
      },
      {
        key: "about",
        template: "about",
        draft: { quoteForm: {} },
        published: null,
      },
    ])
    await run()
    const rows = await db.select().from(pages)
    const contact = rows.find((r) => r.key === "contact")!
    expect(contact.published).toBeNull()
    expect((contact.draft as Data).quoteForm.sendingLabel).toBe("Sending…")
    expect(rows.find((r) => r.key === "about")!.draft).toEqual({
      quoteForm: {},
    })
  })

  it("leaves a quote form without fields intact (no null column)", async () => {
    const bare = { quoteForm: { sentMessage: OLD_SENT } }
    await getDb().insert(pages).values({
      key: "contact",
      template: "contact",
      draft: bare,
      published: bare,
    })
    await run()
    const [row] = await getDb().select().from(pages)
    expect(row.draft).toMatchObject({ quoteForm: FEEDBACK })
    expect(row.published).not.toBeNull()
  })

  it("is a no-op when the row does not exist", async () => {
    await run()
    expect(await getDb().select().from(pages)).toHaveLength(0)
  })
})
