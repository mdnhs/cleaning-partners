import { and, eq } from "drizzle-orm"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { app } from "@/server/api/app"
import { getDb } from "@/server/db/client"
import { auditLog, leadEvents, leads, settings } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { encryptSecret } from "@/server/lib/crypto"
import { hashIp } from "@/server/lib/ip"
import { mailer } from "@/server/lib/mailer"
import { consumeRateLimit, LEAD_RATE_LIMIT } from "@/server/lib/rate-limit"

import { resetDb } from "../db"
import { assertMailpitUp, deleteMail, waitForMail } from "../helpers/mailpit"
import { configureSmtp } from "../helpers/smtp"

let ipCounter = 0
const freshIp = () => `198.51.100.${++ipCounter}`

const BODY = {
  name: "Dinn Rí",
  email: "dinn@example.ie",
  phone: "085 000 0000",
  service: "Commercial Cleaning",
  address: "12 Main Street, Portlaoise, R32 AB12",
  message: "Please quote for weekly office cleaning.",
  consent: true,
  sourcePage: "/contact",
}

function post(body: unknown, ip = freshIp()) {
  return app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

type ErrorBody = {
  error: { code: string; fieldErrors: Record<string, string[]> }
}

async function setLeadsSettings(value: {
  recipients: string[]
  retentionMonths: number
  acknowledgement: boolean
}) {
  await getDb()
    .update(settings)
    .set({ draft: value, published: value })
    .where(eq(settings.key, "leads"))
}

async function saveTurnstile(enabled: boolean) {
  await getDb()
    .insert(settings)
    .values({
      key: "integrations.turnstile",
      draft: {
        enabled,
        siteKey: "0x4AAAAAAAtestsitekey",
        secretKey: encryptSecret(
          "turnstile-secret-value",
          "integrations.turnstile.secretKey"
        ),
      },
      published: null,
      version: 1,
    })
}

let send: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  send = vi.spyOn(mailer, "send").mockResolvedValue({ delivered: true })
  // "[leads] honeypot filled" — keep the test output quiet.
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /api/v1/public/leads (master 7.3)", () => {
  it("valid post → lead row (IP hashed), created event, audit and staff email to the seeded recipient", async () => {
    const ip = freshIp()
    const res = await post(BODY, ip)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const [row] = await getDb().select().from(leads)
    expect(row).toMatchObject({
      name: "Dinn Rí",
      email: "dinn@example.ie",
      phone: "085 000 0000",
      company: null,
      address: "12 Main Street, Portlaoise, R32 AB12",
      service: "Commercial Cleaning",
      message: "Please quote for weekly office cleaning.",
      consent: true,
      status: "new",
      assigneeId: null,
      sourcePage: "/contact",
      ipHash: hashIp(ip),
    })
    expect(row.ipHash).not.toContain(ip)

    const events = await getDb()
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.leadId, row.id))
    expect(events.map((e) => e.type).sort()).toEqual(["created", "email"])
    expect(events.find((e) => e.type === "created")?.body).toBe(
      "Sent from /contact"
    )
    expect(events.find((e) => e.type === "email")?.body).toBe(
      "Staff notification sent to 1 recipient."
    )

    const [audit] = await getDb()
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.action, "lead.created"), eq(auditLog.entityId, row.id))
      )
    expect(audit).toMatchObject({ actorId: null, ip: null })

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({
      to: ["info@cleaningpartners.ie"],
      replyTo: "dinn@example.ie",
      subject: "Quote request from Dinn Rí",
    })
  })

  it("with no recipients configured, the lead is kept and an email event says why", async () => {
    // The settings schema needs one recipient, so an unreadable row is the
    // "no recipients" case: the service reads null and mails nobody.
    await getDb()
      .update(settings)
      .set({ published: null })
      .where(eq(settings.key, "leads"))
    expect((await post(BODY)).status).toBe(200)
    expect(send).not.toHaveBeenCalled()
    const [row] = await getDb().select().from(leads)
    const [email] = await getDb()
      .select()
      .from(leadEvents)
      .where(and(eq(leadEvents.leadId, row.id), eq(leadEvents.type, "email")))
    expect(email.body).toBe(
      "Staff notification not sent: no recipients in Settings ▸ Leads."
    )
  })

  it("sends the optional acknowledgement when enabled and Turnstile verified the visitor", async () => {
    await setLeadsSettings({
      recipients: ["ops@example.ie", "hr@example.ie"],
      retentionMonths: 24,
      acknowledgement: true,
    })
    await saveTurnstile(true)
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    expect((await post({ ...BODY, turnstileToken: "good" })).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0]).toMatchObject({
      to: ["ops@example.ie", "hr@example.ie"],
    })
    expect(send.mock.calls[1][0]).toMatchObject({
      to: "dinn@example.ie",
      subject: "We received your request – Cleaning Partners Ltd.",
    })
  })

  it("acknowledgement enabled but Turnstile off → skipped (no open relay), recorded as an email event", async () => {
    await setLeadsSettings({
      recipients: ["ops@example.ie"],
      retentionMonths: 24,
      acknowledgement: true,
    })
    expect((await post(BODY)).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({ to: ["ops@example.ie"] })
    const [row] = await getDb().select().from(leads)
    const bodies = (
      await getDb()
        .select()
        .from(leadEvents)
        .where(and(eq(leadEvents.leadId, row.id), eq(leadEvents.type, "email")))
    ).map((e) => e.body)
    expect(bodies.sort()).toEqual([
      "Acknowledgement skipped (no Turnstile).",
      "Staff notification sent to 1 recipient.",
    ])
  })

  it("a failed or unconfigured email never fails the request", async () => {
    send.mockResolvedValue({ delivered: false })
    expect((await post(BODY)).status).toBe(200)
    const [row] = await getDb().select().from(leads)
    const [email] = await getDb()
      .select()
      .from(leadEvents)
      .where(and(eq(leadEvents.leadId, row.id), eq(leadEvents.type, "email")))
    expect(email.body).toBe(
      "Staff notification not sent: email is not configured or failed."
    )
  })

  describe("lead fields (R7-3)", () => {
    it("accepts the contact page's extra options and a real service title", async () => {
      for (const service of [
        "Domestic Cleaning",
        "Other",
        "Medical Cleaning",
        "ULV Fogging",
      ])
        expect((await post({ ...BODY, service })).status).toBe(200)
      const stored = (await getDb().select().from(leads)).map((l) => l.service)
      expect(stored.sort()).toEqual([
        "Domestic Cleaning",
        "Medical Cleaning",
        "Other",
        "ULV Fogging",
      ])
    })

    it("a service that is neither published nor an extra option → 422 on service", async () => {
      const res = await post({ ...BODY, service: "Window Fitting" })
      expect(res.status).toBe(422)
      const body = (await res.json()) as ErrorBody
      expect(Object.keys(body.error.fieldErrors)).toEqual(["service"])
      expect(await getDb().select().from(leads)).toHaveLength(0)
    })

    it("a blank address is stored as null, not an empty string", async () => {
      expect((await post({ ...BODY, address: "   " })).status).toBe(200)
      const [row] = await getDb().select().from(leads)
      expect(row.address).toBeNull()
    })

    it("a blank or missing service is stored as null", async () => {
      expect((await post({ ...BODY, service: "" })).status).toBe(200)
      const withoutService = { ...BODY, service: undefined }
      expect((await post(withoutService)).status).toBe(200)
      const rows = await getDb().select().from(leads)
      expect(rows).toHaveLength(2)
      expect(rows.every((r) => r.service === null)).toBe(true)
    })

    it("a missing message is stored as an empty string (column stays NOT NULL)", async () => {
      const withoutMessage = { ...BODY, message: undefined }
      expect((await post(withoutMessage)).status).toBe(200)
      const [row] = await getDb().select().from(leads)
      expect(row.message).toBe("")
    })

    it("a missing or blank phone → 422 on phone", async () => {
      const withoutPhone = { ...BODY, phone: undefined }
      for (const body of [withoutPhone, { ...BODY, phone: "  " }]) {
        const res = await post(body)
        expect(res.status).toBe(422)
        expect(
          Object.keys(((await res.json()) as ErrorBody).error.fieldErrors)
        ).toEqual(["phone"])
      }
    })

    it("consent missing or false → 422 on consent; nothing stored", async () => {
      const withoutConsent = { ...BODY, consent: undefined }
      for (const body of [withoutConsent, { ...BODY, consent: false }]) {
        const res = await post(body)
        expect(res.status).toBe(422)
        const json = (await res.json()) as ErrorBody
        expect(json.error.fieldErrors.consent).toBeDefined()
      }
      expect(await getDb().select().from(leads)).toHaveLength(0)
    })

    it("the notification subject follows the published mailSubject leaf", async () => {
      expect((await post(BODY)).status).toBe(200)
      expect(send.mock.calls[0][0]).toMatchObject({
        subject: "Quote request from Dinn Rí",
      })
    })
  })

  it("honeypot filled → 200 { ok: true } but no lead and no email", async () => {
    const res = await post({ ...BODY, website: "http://spam.example" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(await getDb().select().from(leads)).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
  })

  it("honeypot of any non-empty type fires; empty string does not", async () => {
    for (const website of [1, true, ["x"], { a: 1 }, "  spam  "])
      expect(await (await post({ ...BODY, website })).json()).toEqual({
        ok: true,
      })
    expect(await getDb().select().from(leads)).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
    expect((await post({ ...BODY, website: "" })).status).toBe(200)
    expect(await getDb().select().from(leads)).toHaveLength(1)
  })

  it("sourcePage with NUL, a backslash or // → 422", async () => {
    for (const sourcePage of ["/contact\u0000x", "/\\evil.example", "//x"]) {
      const res = await post({ ...BODY, sourcePage })
      expect(res.status).toBe(422)
      const body = (await res.json()) as ErrorBody
      expect(Object.keys(body.error.fieldErrors)).toEqual(["sourcePage"])
    }
  })

  it("6th post in 10 minutes from the same IP → 429 with Retry-After; other IPs unaffected", async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) {
      expect((await post({ ...BODY, website: "bot" }, ip)).status).toBe(200)
    }
    const limited = await post(BODY, ip)
    expect(limited.status).toBe(429)
    const retryAfter = Number(limited.headers.get("retry-after"))
    expect(retryAfter).toBeGreaterThanOrEqual(1)
    expect(retryAfter).toBeLessThanOrEqual(600)
    const body = (await limited.json()) as { error: { code: string } }
    expect(body.error.code).toBe("RATE_LIMITED")
    expect((await post(BODY)).status).toBe(200)
  })

  it("invalid bodies count too, and the window resets after 10 minutes", async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) expect((await post({}, ip)).status).toBe(422)
    expect((await post(BODY, ip)).status).toBe(429)
    const key = `leads:${hashIp(ip)}`
    const later = new Date(Date.now() + LEAD_RATE_LIMIT.windowMs + 1_000)
    expect(
      await consumeRateLimit(key, { ...LEAD_RATE_LIMIT, now: later })
    ).toMatchObject({ allowed: true, count: 1 })
  })

  it("invalid fields → 422 with fieldErrors", async () => {
    const res = await post({ ...BODY, email: "not-an-email", phone: "" })
    expect(res.status).toBe(422)
    const body = (await res.json()) as ErrorBody
    expect(body.error.code).toBe("VALIDATION_FAILED")
    expect(Object.keys(body.error.fieldErrors).sort()).toEqual([
      "email",
      "phone",
    ])
  })

  it("body over 64 KB → 413", async () => {
    const res = await post({ ...BODY, message: "x".repeat(70 * 1024) })
    expect(res.status).toBe(413)
  })

  it("Turnstile enabled: missing or rejected token → 422; accepted token → lead", async () => {
    await saveTurnstile(true)
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

    const missing = await post(BODY)
    expect(missing.status).toBe(422)
    const missingBody = (await missing.json()) as ErrorBody
    expect(missingBody.error.fieldErrors.turnstileToken).toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()

    const ip = freshIp()
    expect((await post({ ...BODY, turnstileToken: "bad" }, ip)).status).toBe(
      422
    )
    const sent = fetchSpy.mock.calls[0][1] as RequestInit
    expect((sent.body as URLSearchParams).get("secret")).toBe(
      "turnstile-secret-value"
    )
    expect((sent.body as URLSearchParams).get("remoteip")).toBe(ip)
    expect(await getDb().select().from(leads)).toHaveLength(0)

    expect((await post({ ...BODY, turnstileToken: "good" })).status).toBe(200)
    expect(await getDb().select().from(leads)).toHaveLength(1)
  })

  it("never logs the client IP, the visitor's address or the message; audit has no IP or diff", async () => {
    send.mockRestore() // the real mailer: SMTP unconfigured under NODE_ENV=test, so it logs
    const lines: string[] = []
    for (const level of ["log", "info", "warn", "error"] as const)
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "))
      })
    const ip = freshIp()
    expect((await post(BODY, ip)).status).toBe(200)
    expect((await post({ ...BODY, website: "bot" }, ip)).status).toBe(200)
    expect(lines.join("\n")).toContain("[mailer]")
    for (const secret of [
      ip,
      "dinn",
      "Dinn",
      "Please quote",
      "085 000",
      "Main Street",
    ])
      expect(lines.join("\n")).not.toContain(secret)
    const [audit] = await getDb()
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "lead.created"))
    expect(audit).toMatchObject({ ip: null, userAgent: null, diff: null })
  })

  it("Turnstile row unreadable (secret cannot be decrypted) → logged, check skipped, lead kept", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    await saveTurnstile(true)
    await getDb()
      .update(settings)
      .set({
        draft: {
          enabled: true,
          siteKey: "0x4AAAAAAAtestsitekey",
          secretKey: "v1:not:a:secret",
        },
      })
      .where(eq(settings.key, "integrations.turnstile"))
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect((await post(BODY)).status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await getDb().select().from(leads)).toHaveLength(1)
    expect(error.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      "[leads] Turnstile settings could not be read"
    )
  })

  it("Turnstile enabled: the check runs before the honeypot (bot without token → 422 either way)", async () => {
    await saveTurnstile(true)
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
    expect((await post({ ...BODY, website: "bot" })).status).toBe(422)
    expect((await post(BODY)).status).toBe(422)
    expect(fetchSpy).not.toHaveBeenCalled()
    // A verified token with the honeypot filled is still dropped quietly.
    const res = await post({ ...BODY, website: "bot", turnstileToken: "good" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(await getDb().select().from(leads)).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
  })

  it("Turnstile saved but disabled → no check", async () => {
    await saveTurnstile(false)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect((await post(BODY)).status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("GET /api/v1/public/leads/config", () => {
  it("exposes the Turnstile site key only while enabled, never cached", async () => {
    const get = async () => {
      const res = await app.request("/api/v1/public/leads/config")
      expect(res.status).toBe(200)
      expect(res.headers.get("cache-control")).toBe("no-store")
      return res.json()
    }
    expect(await get()).toEqual({ turnstileSiteKey: null })
    await saveTurnstile(true)
    expect(await get()).toEqual({ turnstileSiteKey: "0x4AAAAAAAtestsitekey" })
    await getDb()
      .update(settings)
      .set({
        draft: {
          enabled: false,
          siteKey: "0x4AAAAAAAtestsitekey",
          secretKey: "",
        },
      })
      .where(eq(settings.key, "integrations.turnstile"))
    expect(await get()).toEqual({ turnstileSiteKey: null })
  })
})

describe("staff email through SMTP (Mailpit)", () => {
  beforeAll(assertMailpitUp)

  it("lands at the seeded recipient with the visitor as reply-to (R7-1)", async () => {
    vi.restoreAllMocks()
    await configureSmtp()
    const inbox = "info@cleaningpartners.ie"
    await deleteMail(inbox)
    try {
      expect((await post(BODY)).status).toBe(200)
      const mail = await waitForMail(inbox, {
        subject: "Quote request from Dinn Rí",
      })
      expect(mail.To.map((a) => a.Address)).toEqual([inbox])
      expect(mail.ReplyTo.map((a) => a.Address)).toEqual(["dinn@example.ie"])
      expect(mail.Text).toContain("Please quote for weekly office cleaning.")
      expect(mail.Text).toContain("Commercial Cleaning")
      expect(mail.Text).toContain("R32 AB12")
      expect(mail.HTML).toMatch(/\/admin\/leads\/[0-9a-f-]{36}/)
    } finally {
      await deleteMail(inbox)
    }
  })
})
