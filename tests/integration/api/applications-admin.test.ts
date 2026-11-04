import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type {
  ApplicationDto,
  ApplicationListItem,
} from "@/lib/schemas/api/applications"
import type { Paginated } from "@/lib/schemas/api/list"
import { getDb } from "@/server/db/client"
import {
  jobApplicationEvents,
  jobApplications,
  jobPostings,
} from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { purgeExpiredApplications } from "@/server/modules/applications/service"
import { diskStorage } from "@/server/lib/storage"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

const DAY = 86_400_000
const PDF = new TextEncoder().encode("%PDF-1.7\nMary Kelly CV\n")
let intake: string
let admin: string
let author: string

const answers = {
  rightToWork: "Irish or UK citizen",
  permissionExpiry: null,
  gardaVetting: true,
  livedAbroad: false,
  startDate: "2026-12-01",
  hoursPerWeek: "20–30 hours",
  shifts: ["Weekends"],
  transport: true,
  experience: "1–2 years",
  healthcareExperience: null,
  recentRole: null,
  certificates: [],
}

let keyCounter = 0
async function addApplication(
  over: Partial<typeof jobApplications.$inferInsert> = {},
  { cv = false } = {}
) {
  let cvFields = {}
  if (cv) {
    const key = `private/applications/2026/11/test-${++keyCounter}.pdf`
    await diskStorage().put(key, PDF, "application/pdf")
    cvFields = {
      cvKey: key,
      cvDriver: "disk" as const,
      cvName: "Mary Kelly CV.pdf",
      cvMime: "application/pdf",
      cvSize: PDF.byteLength,
    }
  }
  const [row] = await getDb()
    .insert(jobApplications)
    .values({
      firstName: "Mary",
      surname: "Kelly",
      email: "mary@example.com",
      phone: "085 000 0000",
      town: "Portlaoise",
      answers,
      declaration: true,
      privacyConsent: true,
      ipHash: "secret-hash",
      ...cvFields,
      ...over,
    })
    .returning()
  return row!
}

async function json<T>(res: Response, status = 200): Promise<T> {
  expect(res.status).toBe(status)
  return (await res.json()) as T
}

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  intake = (await signedInUser(["intake"])).cookie
  admin = (await signedInUser(["admin"])).cookie
  author = (await signedInUser(["author"])).cookie
})

describe("GET /applications (inbox)", () => {
  it("lists open applications newest first, filters by status, job and text", async () => {
    const [job] = await getDb()
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .limit(1)
    const now = Date.now()
    await addApplication({
      firstName: "Old",
      createdAt: new Date(now - 2 * DAY),
    })
    await addApplication({
      firstName: "Hired",
      status: "hired",
      createdAt: new Date(now - DAY),
    })
    await addApplication({
      firstName: "Joan",
      jobId: job!.id,
      jobTitle: "Cleaning Operative – Healthcare",
      createdAt: new Date(now),
    })

    const open = await json<Paginated<ApplicationListItem>>(
      await adminRequest("/applications", { cookie: intake })
    )
    expect(open.items.map((a) => a.name)).toEqual(["Joan Kelly", "Old Kelly"])
    expect(open.items[0]).toMatchObject({
      jobTitle: "Cleaning Operative – Healthcare",
      hasCv: false,
    })
    expect(JSON.stringify(open)).not.toContain("secret-hash")

    const all = await json<Paginated<ApplicationListItem>>(
      await adminRequest("/applications?status=all", { cookie: intake })
    )
    expect(all.items).toHaveLength(3)
    const byJob = await json<Paginated<ApplicationListItem>>(
      await adminRequest(`/applications?status=all&jobId=${job!.id}`, {
        cookie: intake,
      })
    )
    expect(byJob.items.map((a) => a.name)).toEqual(["Joan Kelly"])
    const found = await json<Paginated<ApplicationListItem>>(
      await adminRequest("/applications?status=all&q=hired", { cookie: intake })
    )
    expect(found.items.map((a) => a.name)).toEqual(["Hired Kelly"])
  })

  it("needs lead:read", async () => {
    const app = await addApplication({}, { cv: true })
    expect(
      (await adminRequest("/applications", { cookie: author })).status
    ).toBe(403)
    expect(
      (await adminRequest(`/applications/${app.id}`, { cookie: author })).status
    ).toBe(403)
    expect(
      (await adminRequest(`/applications/${app.id}/cv`, { cookie: author }))
        .status
    ).toBe(403)
  })
})

describe("one application", () => {
  it("returns the answers, the CV's name and the timeline, never the storage key", async () => {
    const app = await addApplication({}, { cv: true })
    const dto = await json<ApplicationDto>(
      await adminRequest(`/applications/${app.id}`, { cookie: intake })
    )
    expect(dto).toMatchObject({
      id: app.id,
      name: "Mary Kelly",
      answers: { shifts: ["Weekends"], gardaVetting: true },
      cv: { name: "Mary Kelly CV.pdf", mime: "application/pdf" },
    })
    const text = JSON.stringify(dto)
    expect(text).not.toContain("private/")
    expect(text).not.toContain("secret-hash")
  })

  it("downloads the CV as a private attachment", async () => {
    const app = await addApplication({}, { cv: true })
    const res = await adminRequest(`/applications/${app.id}/cv`, {
      cookie: intake,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="Mary Kelly CV\.pdf"/
    )
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF)

    const none = await addApplication()
    expect(
      (await adminRequest(`/applications/${none.id}/cv`, { cookie: intake }))
        .status
    ).toBe(404)
  })

  it("moves the status and adds notes to the timeline", async () => {
    const app = await addApplication()
    const moved = await json<ApplicationDto>(
      await adminRequest(`/applications/${app.id}`, {
        cookie: intake,
        method: "PATCH",
        json: { status: "shortlisted" },
      })
    )
    expect(moved.status).toBe("shortlisted")
    await json(
      await adminRequest(`/applications/${app.id}/notes`, {
        cookie: intake,
        method: "POST",
        json: { body: "Called, available Monday." },
      }),
      201
    )
    const events = await getDb()
      .select()
      .from(jobApplicationEvents)
      .where(eq(jobApplicationEvents.applicationId, app.id))
    expect(events.map((e) => e.type).sort()).toEqual(["note", "status"])
  })

  it("delete removes the row and the stored CV; intake may not delete", async () => {
    const app = await addApplication({}, { cv: true })
    expect(
      (
        await adminRequest(`/applications/${app.id}`, {
          cookie: intake,
          method: "DELETE",
        })
      ).status
    ).toBe(403)
    await json(
      await adminRequest(`/applications/${app.id}`, {
        cookie: admin,
        method: "DELETE",
      })
    )
    expect(
      await getDb()
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.id, app.id))
    ).toHaveLength(0)
    expect(await diskStorage().read(app.cvKey!)).toBeNull()
  })
})

describe("GET /applications/export.csv", () => {
  it("one row per application, no CV key or IP hash", async () => {
    await addApplication({}, { cv: true })
    await addApplication({ firstName: "Joan", status: "spam" })
    const res = await adminRequest("/applications/export.csv?status=all", {
      cookie: admin,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/^text\/csv/)
    expect(res.headers.get("cache-control")).toBe("no-store")
    const text = await res.text()
    const lines = text.slice(1).trim().split("\r\n")
    expect(lines).toHaveLength(3)
    expect(text).not.toContain("private/")
    expect(text).not.toContain("secret-hash")
    expect(text).toContain("Mary Kelly CV.pdf")
  })

  it("needs lead:export", async () => {
    expect(
      (await adminRequest("/applications/export.csv", { cookie: author }))
        .status
    ).toBe(403)
  })
})

describe("purgeExpiredApplications (daily)", () => {
  it("deletes applications older than the retention period and their CVs, keeps newer ones", async () => {
    const now = new Date("2026-11-05T03:00:00Z")
    const old = await addApplication(
      { createdAt: new Date("2025-10-01T00:00:00Z") },
      { cv: true }
    )
    const recent = await addApplication(
      { createdAt: new Date("2026-10-01T00:00:00Z") },
      { cv: true }
    )
    expect(await purgeExpiredApplications(now)).toEqual({ deleted: 1 })
    const left = await getDb()
      .select({ id: jobApplications.id })
      .from(jobApplications)
    expect(left.map((r) => r.id)).toEqual([recent.id])
    expect(await diskStorage().read(old.cvKey!)).toBeNull()
    expect(await diskStorage().read(recent.cvKey!)).not.toBeNull()
  })
})
