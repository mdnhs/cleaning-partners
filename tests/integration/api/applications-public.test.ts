import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import { app } from "@/server/api/app"
import { getDb } from "@/server/db/client"
import {
  jobApplicationEvents,
  jobApplications,
  jobPostings,
} from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { diskStorage } from "@/server/lib/storage"
import { hashIp } from "@/server/lib/ip"
import { mailer } from "@/server/lib/mailer"

import { resetDb } from "../db"

let ipCounter = 0
const freshIp = () => `203.0.113.${++ipCounter}`

const PDF = new TextEncoder().encode("%PDF-1.7\nMary Kelly CV\n")

function form(over: Record<string, string | string[] | File | null> = {}) {
  const values: Record<string, string | string[] | File | null> = {
    firstName: "Mary",
    surname: "Kelly",
    email: "mary@example.com",
    phone: "085 000 0000",
    address: "1 Main Street",
    town: "Portlaoise, Co. Laois",
    eircode: "R32 YX49",
    rightToWork: "Irish or UK citizen",
    permissionExpiry: "",
    gardaVetting: "yes",
    livedAbroad: "no",
    startDate: "2026-12-01",
    hoursPerWeek: "20–30 hours",
    shifts: ["Early mornings (6am–11am)", "Weekends"],
    transport: "yes",
    experience: "1–2 years",
    healthcareExperience: "None",
    recentRole: "Office Cleaner at ABC, 2024–2026",
    certificates: ["Manual Handling"],
    note: "Mornings suit me best.",
    heardAbout: "Indeed",
    declaration: "on",
    privacy: "on",
    keepOnFile: "on",
    sourcePage: "/careers/cleaning-operative-healthcare/apply",
    cv: new File([PDF], "Mary Kelly CV.pdf", { type: "application/pdf" }),
    ...over,
  }
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (value === null) continue
    if (Array.isArray(value)) for (const v of value) data.append(key, v)
    else data.append(key, value)
  }
  return data
}

const post = (data: FormData, ip = freshIp()) =>
  app.request("/api/v1/public/applications", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: data,
  })

type ErrorBody = {
  error: { code: string; fieldErrors?: Record<string, string[]> }
}

let healthcareId: string
let closedId: string
let send: ReturnType<typeof vi.spyOn>
const stored: string[] = []

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  const rows = await getDb()
    .select({ id: jobPostings.id, slug: jobPostings.slug })
    .from(jobPostings)
  healthcareId = rows.find(
    (r) => r.slug === "cleaning-operative-healthcare"
  )!.id
  closedId = rows.find((r) => r.slug === "school-cleaning-operative")!.id
  send = vi.spyOn(mailer, "send").mockResolvedValue({ delivered: true })
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const row of await getDb()
    .select({ key: jobApplications.cvKey })
    .from(jobApplications))
    if (row.key) stored.push(row.key)
  for (const key of stored.splice(0)) await diskStorage().delete(key)
})

describe("POST /api/v1/public/applications", () => {
  it("stores the application, its CV and a created event, and emails the staff", async () => {
    const ip = freshIp()
    const res = await post(form({ jobId: healthcareId }), ip)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const [row] = await getDb().select().from(jobApplications)
    expect(row).toMatchObject({
      jobId: healthcareId,
      jobTitle: "Cleaning Operative – Healthcare",
      jobReference: "CP-2611-HC",
      firstName: "Mary",
      surname: "Kelly",
      email: "mary@example.com",
      town: "Portlaoise, Co. Laois",
      declaration: true,
      privacyConsent: true,
      keepOnFile: true,
      status: "new",
      cvName: "Mary Kelly CV.pdf",
      cvMime: "application/pdf",
      cvSize: PDF.byteLength,
      ipHash: hashIp(ip),
    })
    expect(row!.answers).toEqual({
      rightToWork: "Irish or UK citizen",
      permissionExpiry: null,
      gardaVetting: true,
      livedAbroad: false,
      startDate: "2026-12-01",
      hoursPerWeek: "20–30 hours",
      shifts: ["Early mornings (6am–11am)", "Weekends"],
      transport: true,
      experience: "1–2 years",
      healthcareExperience: "None",
      recentRole: "Office Cleaner at ABC, 2024–2026",
      certificates: ["Manual Handling"],
    })
    expect(await diskStorage().read(row!.cvKey!)).not.toBeNull()
    const events = await getDb()
      .select()
      .from(jobApplicationEvents)
      .where(eq(jobApplicationEvents.applicationId, row!.id))
    expect(events.map((e) => e.type)).toContain("created")
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["info@cleaningpartners.ie"],
        template: "application-notification",
        replyTo: "mary@example.com",
      })
    )
  })

  it("refuses an application to a closed job", async () => {
    const res = await post(form({ jobId: closedId }))
    expect(res.status).toBe(409)
    expect(((await res.json()) as ErrorBody).error.code).toBe("CONFLICT")
    expect(await getDb().select().from(jobApplications)).toEqual([])
  })

  it("rejects options that are not in the published form", async () => {
    const res = await post(form({ jobId: healthcareId, shifts: ["Nights"] }))
    expect(res.status).toBe(422)
    expect(
      ((await res.json()) as ErrorBody).error.fieldErrors?.shifts
    ).toBeDefined()
    const hours = await post(form({ hoursPerWeek: "60 hours" }))
    expect(
      ((await hours.json()) as ErrorBody).error.fieldErrors?.hoursPerWeek
    ).toBeDefined()
  })

  it("names each missing required field", async () => {
    const res = await post(
      form({
        firstName: "",
        email: "not-an-email",
        declaration: null,
        privacy: null,
      })
    )
    expect(res.status).toBe(422)
    const fields = ((await res.json()) as ErrorBody).error.fieldErrors ?? {}
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining(["firstName", "email", "declaration", "privacy"])
    )
  })

  it("a filled honeypot looks fine but stores nothing", async () => {
    const res = await post(form({ website: "spam.example" }))
    expect(res.status).toBe(200)
    expect(await getDb().select().from(jobApplications)).toEqual([])
  })

  it("the sixth attempt in ten minutes from one address is refused", async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++)
      expect((await post(form(), ip)).status).toBe(200)
    expect((await post(form(), ip)).status).toBe(429)
  })

  it("a failed email still keeps the application, with an email event saying so", async () => {
    send.mockResolvedValue({ delivered: false })
    expect((await post(form({ jobId: healthcareId }))).status).toBe(200)
    const [row] = await getDb().select().from(jobApplications)
    const events = await getDb()
      .select()
      .from(jobApplicationEvents)
      .where(eq(jobApplicationEvents.applicationId, row!.id))
    expect(
      events.some((e) => e.type === "email" && /not sent/i.test(e.body ?? ""))
    ).toBe(true)
  })

  it("the talent pool form has no job; no CV is fine", async () => {
    expect((await post(form({ cv: null }))).status).toBe(200)
    const [row] = await getDb().select().from(jobApplications)
    expect(row).toMatchObject({ jobId: null, jobTitle: null, cvKey: null })
  })

  it("rejects a CV that is not a PDF or Word file", async () => {
    const res = await post(
      form({
        cv: new File([new TextEncoder().encode("MZ not a cv")], "cv.pdf", {
          type: "application/pdf",
        }),
      })
    )
    expect(res.status).toBe(422)
    expect(
      ((await res.json()) as ErrorBody).error.fieldErrors?.cv
    ).toBeDefined()
    expect(await getDb().select().from(jobApplications)).toEqual([])
  })

  it("takes a 4 MB CV past the public 64 KB body limit, refuses 6 MB", async () => {
    const big = (size: number) => {
      const bytes = new Uint8Array(size)
      bytes.set(PDF)
      return new File([bytes], "cv.pdf", { type: "application/pdf" })
    }
    expect((await post(form({ cv: big(4 * 1024 * 1024) }))).status).toBe(200)
    expect([413, 422]).toContain(
      (await post(form({ cv: big(6 * 1024 * 1024) }))).status
    )
  })
})
