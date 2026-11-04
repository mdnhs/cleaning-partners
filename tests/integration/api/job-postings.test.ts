import { beforeEach, describe, expect, it, vi } from "vitest"

// Hono runs outside Next here: record invalidations instead of revalidating.
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))
// Public queries read draft mode; there is no request here.
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}))

import type { JobDto } from "@/lib/schemas/api/job-postings"
import type { Paginated } from "@/lib/schemas/api/list"
import { tag } from "@/server/lib/cache-tags"
import { listPublishedJobs } from "@/server/modules/job-postings/queries"
import { resolvePublicPath } from "@/server/modules/redirects/resolve"
import { listSitemapEntries } from "@/server/modules/seo/queries"

import { healthcareJob } from "../../unit/helpers/job-fixture"
import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

type Who = { cookie: string }
let editor: Who
let viewer: Who

beforeEach(async () => {
  await resetDb()
  editor = await signedInUser(["editor"])
  viewer = await signedInUser(["viewer"])
  revalidateTag.mockClear()
})

const json = async <T>(res: Response) => (await res.json()) as T
const call = (who: Who, path: string, method = "GET", body?: unknown) =>
  adminRequest(`/job-postings${path}`, {
    cookie: who.cookie,
    method,
    json: body,
  })

async function create(
  slug = "cleaning-operative-healthcare",
  draft: unknown = healthcareJob
) {
  const res = await call(editor, "", "POST", { slug, draft })
  expect(res.status).toBe(201)
  return json<JobDto>(res)
}

async function published(slug?: string) {
  const job = await create(slug)
  const res = await call(editor, `/${job.id}/publish`, "POST", {
    version: job.version,
  })
  expect(res.status).toBe(200)
  return json<JobDto>(res)
}

describe("job postings API", () => {
  it("an editor creates a draft at /careers/<slug>", async () => {
    const job = await create()
    expect(job).toMatchObject({
      slug: "cleaning-operative-healthcare",
      path: "/careers/cleaning-operative-healthcare",
      status: "draft",
      published: null,
      closedAt: null,
      open: false,
    })
  })

  it("a viewer can read but not create", async () => {
    const res = await call(viewer, "", "POST", {
      slug: "x",
      draft: healthcareJob,
    })
    expect(res.status).toBe(403)
    expect((await call(viewer, "")).status).toBe(200)
  })

  it("publishing makes it open and public; closing and reopening move it", async () => {
    const job = await published()
    expect(job.open).toBe(true)
    expect((await listPublishedJobs()).map((j) => j.slug)).toEqual([
      "cleaning-operative-healthcare",
    ])
    const closed = await json<JobDto>(
      await call(editor, `/${job.id}/close`, "POST", { version: job.version })
    )
    expect(closed.closedAt).not.toBeNull()
    expect(closed.open).toBe(false)
    expect(revalidateTag).toHaveBeenCalledWith(tag.jobs, expect.anything())
    const reopened = await json<JobDto>(
      await call(editor, `/${job.id}/reopen`, "POST", {
        version: closed.version,
      })
    )
    expect(reopened.closedAt).toBeNull()
    expect(reopened.open).toBe(true)
  })

  it("lists by status: open, closed, draft", async () => {
    const open = await published("open-role")
    const closedJob = await published("closed-role")
    await call(editor, `/${closedJob.id}/close`, "POST", {
      version: closedJob.version,
    })
    await create("draft-role")
    const slugs = async (status: string) =>
      (
        await json<Paginated<JobDto>>(await call(editor, `?status=${status}`))
      ).items.map((j) => j.slug)
    expect(await slugs("open")).toEqual([open.slug])
    expect(await slugs("closed")).toEqual(["closed-role"])
    expect(await slugs("draft")).toEqual(["draft-role"])
  })

  it("renaming a published job leaves a 301 from the old address", async () => {
    const job = await published()
    const res = await call(editor, `/${job.id}/slug`, "PATCH", {
      slug: "healthcare-cleaner",
      version: job.version,
    })
    expect(res.status).toBe(200)
    expect(
      await resolvePublicPath("/careers/cleaning-operative-healthcare", {
        draft: false,
      })
    ).toMatchObject({
      kind: "redirect",
      to: "/careers/healthcare-cleaner",
      code: 301,
    })
  })

  it("unknown and draft job addresses are a real 404; published ones pass", async () => {
    await create("draft-role")
    expect(
      await resolvePublicPath("/careers/draft-role", { draft: false })
    ).toEqual({
      kind: "missing",
    })
    await published("open-role")
    expect(
      await resolvePublicPath("/careers/open-role", { draft: false })
    ).toEqual({
      kind: "pass",
    })
  })

  it("published jobs are in the sitemap", async () => {
    await published("open-role")
    await create("draft-role")
    const paths = (await listSitemapEntries()).map((e) => e.path)
    expect(paths).toContain("/careers/open-role")
    expect(paths).not.toContain("/careers/draft-role")
  })

  it("deletes with the current version only", async () => {
    const job = await create()
    expect((await call(editor, `/${job.id}?version=99`, "DELETE")).status).toBe(
      409
    )
    expect(
      (await call(editor, `/${job.id}?version=${job.version}`, "DELETE")).status
    ).toBe(200)
    expect((await call(editor, `/${job.id}`)).status).toBe(404)
  })

  it("refuses an incomplete draft field by field", async () => {
    const res = await call(editor, "", "POST", {
      slug: "x-role",
      draft: { ...healthcareJob, essential: [] },
    })
    expect(res.status).toBe(422)
    expect(
      (
        (await res.json()) as {
          error: { fieldErrors: Record<string, string[]> }
        }
      ).error.fieldErrors.essential
    ).toBeDefined()
  })

  it("reorders jobs (the careers list order); viewers cannot", async () => {
    const a = await create("a-role")
    const b = await create("b-role")
    const put = (who: Who) =>
      adminRequest("/reorder/jobs", {
        cookie: who.cookie,
        method: "PUT",
        json: { ids: [b.id, a.id] },
      })
    expect((await put(viewer)).status).toBe(403)
    expect((await put(editor)).status).toBe(200)
    const items = (await json<Paginated<JobDto>>(await call(editor, ""))).items
    expect(items.map((j) => j.slug)).toEqual(["b-role", "a-role"])
    expect(revalidateTag).toHaveBeenCalledWith(tag.jobs, expect.anything())
  })
})

