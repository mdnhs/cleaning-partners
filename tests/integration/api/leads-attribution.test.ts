import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { app } from "@/server/api/app"
import { getDb } from "@/server/db/client"
import { auditLog, leadEvents, leads } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { mailer } from "@/server/lib/mailer"

import { resetDb } from "../db"

let ipCounter = 0
const freshIp = () => `198.51.100.${++ipCounter}`

const BODY = {
  name: "Dinn Rí",
  email: "dinn@example.ie",
  phone: "085 000 0000",
  message: "Please quote for weekly office cleaning.",
  consent: true,
  sourcePage: "/contact",
}

const ATTRIBUTION = {
  referrer: "https://www.google.com/search",
  landingPath: "/services/office-cleaning",
  utm: {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "autumn-26",
    utm_term: "cleaning dublin",
    utm_content: "ad-1",
  },
  capturedAt: "2026-10-20T09:30:00.000Z",
}

function post(body: unknown) {
  return app.request("/api/v1/public/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": freshIp(),
    },
    body: JSON.stringify(body),
  })
}

async function onlyLead() {
  const rows = await getDb().select().from(leads)
  expect(rows).toHaveLength(1)
  return rows[0]
}

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  vi.spyOn(mailer, "send").mockResolvedValue({ delivered: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("lead attribution (D3.1)", () => {
  it("a lead with attribution stores it on the lead row", async () => {
    expect((await post({ ...BODY, attribution: ATTRIBUTION })).status).toBe(200)
    const row = await onlyLead()
    expect(row.attribution).toEqual(ATTRIBUTION)
  })

  it("a lead without attribution stores null", async () => {
    expect((await post(BODY)).status).toBe(200)
    const row = await onlyLead()
    expect(row.attribution).toBeNull()
  })

  it("invalid attribution never loses the enquiry: dropped, warned, lead saved (M5)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const invalid = [
      { ...ATTRIBUTION, utm: { utm_source: "x".repeat(10_000) } },
      { ...ATTRIBUTION, referrer: `https://e.example/${"r".repeat(300)}` },
      { ...ATTRIBUTION, landingPath: `/${"p".repeat(300)}` },
      { ...ATTRIBUTION, utm: { gclid: "abc" } },
      { ...ATTRIBUTION, capturedAt: "not a date" },
      "a string",
      42,
    ]
    for (const [i, attribution] of invalid.entries()) {
      const res = await post({
        ...BODY,
        email: `m5-${i}@example.ie`,
        attribution,
      })
      expect(res.status).toBe(200)
    }
    const rows = await getDb().select().from(leads)
    expect(rows).toHaveLength(invalid.length)
    expect(rows.every((r) => r.attribution === null)).toBe(true)
    expect(warn).toHaveBeenCalledTimes(invalid.length)
    expect(warn).toHaveBeenCalledWith(
      "[leads] invalid attribution dropped; enquiry kept"
    )
    // The log line never carries the visitor's values.
    expect(JSON.stringify(warn.mock.calls)).not.toContain("e.example")
  })

  it("a lone surrogate or an emoji at the cap still saves the lead (I2)", async () => {
    const res = await post({
      ...BODY,
      attribution: {
        ...ATTRIBUTION,
        utm: {
          utm_source: "\ud800x",
          utm_content: `${"a".repeat(198)}\u{1F680}`,
          utm_term: `${"b".repeat(199)}\ud83d`,
        },
      },
    })
    expect(res.status).toBe(200)
    const row = await onlyLead()
    expect(row.attribution?.utm).toEqual({
      utm_source: "x",
      utm_content: `${"a".repeat(198)}\u{1F680}`,
      utm_term: "b".repeat(199),
    })
  })

  it("the server strips a referrer query and forces a site landing path (M1, M2)", async () => {
    const res = await post({
      ...BODY,
      attribution: {
        ...ATTRIBUTION,
        referrer: "https://www.google.com/search?q=private#x",
        landingPath: "https://evil.example/x",
      },
    })
    expect(res.status).toBe(200)
    const row = await onlyLead()
    expect(row.attribution).toMatchObject({
      referrer: "https://www.google.com/search",
      landingPath: "/",
    })
  })

  it("hostile values are stored as plain text: control/bidi characters stripped, non-web referrers dropped", async () => {
    const res = await post({
      ...BODY,
      attribution: {
        referrer: "javascript:alert(1)",
        landingPath: "/x\u0000\u202E",
        utm: {
          utm_source: "  <script>alert(1)</script>\u0007 ",
          utm_medium: "\u2028",
        },
        capturedAt: ATTRIBUTION.capturedAt,
      },
    })
    expect(res.status).toBe(200)
    const row = await onlyLead()
    expect(row.attribution).toEqual({
      referrer: null,
      landingPath: "/x",
      utm: { utm_source: "<script>alert(1)</script>" },
      capturedAt: ATTRIBUTION.capturedAt,
    })
  })

  it("stores attribution only on the lead row, never in the audit log or events", async () => {
    await post({ ...BODY, attribution: ATTRIBUTION })
    const row = await onlyLead()
    const events = await getDb()
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.leadId, row.id))
    expect(JSON.stringify(events)).not.toContain("google")
    const audit = await getDb().select().from(auditLog)
    expect(JSON.stringify(audit)).not.toContain("google")
    const [fresh] = await getDb()
      .select({ a: leads.attribution })
      .from(leads)
      .where(eq(leads.id, row.id))
    expect(fresh.a?.utm.utm_source).toBe("google")
  })
})
