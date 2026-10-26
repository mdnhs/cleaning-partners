import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Hono runs outside Next here: record invalidations instead of revalidating.
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type { BuilderPageDto } from "@/lib/schemas/api/builder-pages"
import type { RevisionSummary } from "@/lib/schemas/api/content"
import type { Paginated } from "@/lib/schemas/api/list"
import { getDb } from "@/server/db/client"
import { auditLog, builderPages, media, redirects } from "@/server/db/schema"
import { listMediaUsagesFor } from "@/server/modules/media/repo"
import { resolvePublicPath } from "@/server/modules/redirects/resolve"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

type Who = { cookie: string; user: { id: string } }
type ErrorBody = {
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string[]>
    current?: BuilderPageDto
  }
}

let editor: Who
let admin: Who
let owner: Who
let marketer: Who
let viewer: Who
let author: Who
let imageId: string

beforeEach(async () => {
  await resetDb()
  editor = await signedInUser(["editor"])
  admin = await signedInUser(["admin"])
  owner = await signedInUser(["owner"])
  marketer = await signedInUser(["marketer"])
  viewer = await signedInUser(["viewer"])
  author = await signedInUser(["author"])
  const [row] = await getDb()
    .insert(media)
    .values({
      key: "/images/builder-test.png",
      driver: "static",
      mime: "image/png",
      size: 1,
    })
    .returning({ id: media.id })
  imageId = row.id
  revalidateTag.mockClear()
})

const json = async <T>(res: Response) => (await res.json()) as T
const call = (who: Who, path: string, method = "GET", body?: unknown) =>
  adminRequest(`/builder-pages${path}`, {
    cookie: who.cookie,
    method,
    json: body,
  })

const richtext = (id: string, anchor: string, text = "Hello") => ({
  id,
  type: "richtext",
  anchor,
  hidden: false,
  data: {
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  },
})
const heroPage = (id: string, image: string | null = imageId) => ({
  id,
  type: "hero.page",
  anchor: "hero",
  hidden: false,
  data: {
    image: image ? { mediaId: image } : null,
    crumb: "Landing",
    title: "Landing",
    description: "Intro",
  },
})
const hero = (id: string) => ({
  id,
  type: "hero",
  anchor: "hero",
  hidden: false,
  data: {},
})

async function create(who: Who, slug = "landing", seed?: unknown) {
  const res = await call(who, "", "POST", { slug, title: "Landing", seed })
  expect(res.status).toBe(201)
  return json<BuilderPageDto>(res)
}

async function saveDraft(who: Who, page: BuilderPageDto, blocks: unknown[]) {
  const res = await call(who, `/${page.id}/draft`, "PUT", {
    draft: { blocks },
    version: page.version,
  })
  expect(res.status).toBe(200)
  return json<BuilderPageDto>(res)
}

async function publishedPage(who = editor, slug = "landing") {
  const page = await create(who, slug)
  const saved = await saveDraft(who, page, [
    heroPage("hero-1"),
    richtext("text-1", "intro"),
  ])
  const res = await call(who, `/${page.id}/publish`, "POST", {
    version: saved.version,
  })
  expect(res.status).toBe(200)
  return json<BuilderPageDto>(res)
}

describe("create", () => {
  it("an editor creates a blank draft page at /p/<slug>", async () => {
    const page = await create(editor)
    expect(page).toMatchObject({
      slug: "landing",
      title: "Landing",
      path: "/p/landing",
      status: "draft",
      version: 1,
      published: null,
      draft: { blocks: [] },
    })
    const [log] = await getDb()
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "builder-page.created"))
    expect(log.entityId).toBe(page.id)
  })

  it("accepts a seed document as the draft", async () => {
    const page = await create(editor, "copy", {
      blocks: [richtext("text-1", "a")],
    })
    expect(page.draft.blocks).toHaveLength(1)
  })

  it("rejects a seed with an unknown block type", async () => {
    const res = await call(editor, "", "POST", {
      slug: "bad-seed",
      title: "Bad",
      seed: { blocks: [{ ...richtext("text-1", "a"), type: "nope" }] },
    })
    expect(res.status).toBe(422)
  })

  it("a duplicate slug is 409 on the slug field", async () => {
    await create(editor)
    const res = await call(editor, "", "POST", {
      slug: "landing",
      title: "Again",
    })
    expect(res.status).toBe(409)
    expect((await json<ErrorBody>(res)).error.fieldErrors?.slug).toBeTruthy()
  })

  it("two concurrent creates of one slug give one 201 and one 409", async () => {
    const statuses = (
      await Promise.all(
        [editor, admin].map((who) =>
          call(who, "", "POST", { slug: "race", title: "Race" })
        )
      )
    )
      .map((r) => r.status)
      .sort()
    expect(statuses).toEqual([201, 409])
  })

  it("a marketer gets 403 on create", async () => {
    const res = await call(marketer, "", "POST", { slug: "x", title: "X" })
    expect(res.status).toBe(403)
  })

  it.each(["", "Landing", "a/b", "a-", "a".repeat(61), "é", "admin"])(
    "rejects the slug %j with 422",
    async (slug) => {
      const res = await call(editor, "", "POST", { slug, title: "X" })
      expect(res.status).toBe(422)
    }
  )
})

describe("draft and publish", () => {
  it("a draft accepts an incomplete block; publish rejects it by path", async () => {
    const page = await create(editor)
    const saved = await saveDraft(editor, page, [
      { ...richtext("text-1", "intro"), data: {} },
    ])
    const res = await call(editor, `/${page.id}/publish`, "POST", {
      version: saved.version,
    })
    expect(res.status).toBe(422)
    const { error } = await json<ErrorBody>(res)
    expect(
      Object.keys(error.fieldErrors ?? {}).some((k) =>
        k.startsWith("blocks.0.")
      )
    ).toBe(true)
    const [row] = await getDb().select().from(builderPages)
    expect(row.published).toBeNull()
  })

  it("publishing hero and hero.page together is 422 on blocks.1.type", async () => {
    const page = await create(editor)
    const saved = await saveDraft(editor, page, [
      heroPage("hero-1"),
      { ...hero("hero-2"), anchor: "hero-home" },
    ])
    const res = await call(editor, `/${page.id}/publish`, "POST", {
      version: saved.version,
    })
    expect(res.status).toBe(422)
    expect(
      (await json<ErrorBody>(res)).error.fieldErrors?.["blocks.1.type"]
    ).toBeTruthy()
  })

  it("publishing an empty document is 422", async () => {
    const page = await create(editor)
    const res = await call(editor, `/${page.id}/publish`, "POST", {
      version: page.version,
    })
    expect(res.status).toBe(422)
  })

  it("publish writes a revision and expires the page tags", async () => {
    const page = await publishedPage()
    expect(page.status).toBe("published")
    expect(page.published).toEqual(page.draft)
    const tags = revalidateTag.mock.calls.map((c) => c[0])
    expect(tags).toEqual(
      expect.arrayContaining(["builder-pages", "builder-page:landing"])
    )
    const res = await adminRequest(`/revisions/builder-page/${page.id}`, {
      cookie: editor.cookie,
    })
    expect(res.status).toBe(200)
    expect((await json<{ items: RevisionSummary[] }>(res)).items).toHaveLength(
      1
    )
  })

  it("restore loads a revision into the draft", async () => {
    const page = await publishedPage()
    const changed = await saveDraft(editor, page, [
      heroPage("hero-1"),
      richtext("text-1", "intro", "Changed"),
      richtext("text-2", "more"),
    ])
    const list = await json<{ items: RevisionSummary[] }>(
      await adminRequest(`/revisions/builder-page/${page.id}`, {
        cookie: editor.cookie,
      })
    )
    const res = await call(editor, `/${page.id}/restore`, "POST", {
      revisionId: list.items[0].id,
      version: changed.version,
    })
    expect(res.status).toBe(200)
    const restored = await json<BuilderPageDto>(res)
    expect(restored.draft.blocks).toHaveLength(2)
    expect(restored.version).toBe(changed.version + 1)
  })
})

describe("stale versions", () => {
  it("answers 409 with the current state on draft, publish, restore, meta and delete", async () => {
    const page = await publishedPage()
    const {
      items: [rev],
    } = await json<{ items: RevisionSummary[] }>(
      await adminRequest(`/revisions/builder-page/${page.id}`, {
        cookie: editor.cookie,
      })
    )
    const stale = page.version - 1
    const attempts: [string, string, unknown][] = [
      [`/${page.id}/draft`, "PUT", { draft: { blocks: [] }, version: stale }],
      [`/${page.id}/publish`, "POST", { version: stale }],
      [`/${page.id}/restore`, "POST", { revisionId: rev.id, version: stale }],
      [`/${page.id}/meta`, "PATCH", { title: "New", version: stale }],
      [`/${page.id}?version=${stale}`, "DELETE", undefined],
    ]
    for (const [path, method, body] of attempts) {
      const res = await call(editor, path, method, body)
      expect(res.status, `${method} ${path}`).toBe(409)
      const { error } = await json<ErrorBody>(res)
      expect(error.code).toBe("CONFLICT")
      expect(error.current?.version).toBe(page.version)
    }
  })
})

describe("meta, redirects", () => {
  it("renaming a published page records a redirect and expires the tags", async () => {
    const page = await publishedPage()
    revalidateTag.mockClear()
    const res = await call(editor, `/${page.id}/meta`, "PATCH", {
      slug: "landing-new",
      version: page.version,
    })
    expect(res.status).toBe(200)
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "builder-pages",
      "builder-page:landing",
      "builder-page:landing-new",
      "redirects",
    ])
    const [move] = await getDb()
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, "/p/landing"))
    expect(move).toMatchObject({
      toPath: "/p/landing-new",
      code: 301,
      source: "auto",
    })
    const outcome = await resolvePublicPath("/p/landing", { draft: false })
    expect(outcome).toMatchObject({ kind: "redirect", to: "/p/landing-new" })
    const [log] = await getDb()
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "builder-page.meta_changed"))
    expect(log.entityId).toBe(page.id)
  })

  it("renaming an unpublished page records nothing", async () => {
    const page = await create(editor)
    revalidateTag.mockClear()
    const res = await call(editor, `/${page.id}/meta`, "PATCH", {
      slug: "draft-new",
      version: page.version,
    })
    expect(res.status).toBe(200)
    expect(await getDb().select().from(redirects)).toHaveLength(0)
    expect(revalidateTag.mock.calls.map((c) => c[0])).not.toContain("redirects")
  })

  it("a title-only change keeps the address and records nothing", async () => {
    const page = await publishedPage()
    const res = await call(editor, `/${page.id}/meta`, "PATCH", {
      title: "Renamed",
      version: page.version,
    })
    expect(res.status).toBe(200)
    expect(await json<BuilderPageDto>(res)).toMatchObject({
      title: "Renamed",
      slug: "landing",
    })
    expect(await getDb().select().from(redirects)).toHaveLength(0)
  })

  it("renaming onto a taken slug is 409; a reserved or empty change is 422", async () => {
    await create(editor, "taken")
    const page = await create(editor, "mine")
    const clash = await call(editor, `/${page.id}/meta`, "PATCH", {
      slug: "taken",
      version: page.version,
    })
    expect(clash.status).toBe(409)
    expect((await json<ErrorBody>(clash)).error.fieldErrors?.slug).toBeTruthy()
    for (const body of [{ slug: "admin" }, {}])
      expect(
        (
          await call(editor, `/${page.id}/meta`, "PATCH", {
            ...body,
            version: page.version,
          })
        ).status
      ).toBe(422)
  })
})

describe("delete", () => {
  it("with redirectHome a published page's address goes to / (301)", async () => {
    const page = await publishedPage()
    revalidateTag.mockClear()
    const res = await call(
      editor,
      `/${page.id}?version=${page.version}&redirectHome=true`,
      "DELETE"
    )
    expect(res.status).toBe(200)
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "builder-pages",
      "builder-page:landing",
      "redirects",
    ])
    const [row] = await getDb()
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, "/p/landing"))
    expect(row).toMatchObject({ toPath: "/", code: 301, source: "auto" })
    expect(
      await resolvePublicPath("/p/landing", { draft: false })
    ).toMatchObject({ kind: "redirect", to: "/" })
    expect((await call(editor, `/${page.id}`)).status).toBe(404)
  })

  it("without redirectHome nothing is recorded", async () => {
    const page = await publishedPage()
    revalidateTag.mockClear()
    const res = await call(
      editor,
      `/${page.id}?version=${page.version}`,
      "DELETE"
    )
    expect(res.status).toBe(200)
    expect(await getDb().select().from(redirects)).toHaveLength(0)
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "builder-pages",
      "builder-page:landing",
    ])
    expect((await call(editor, `/${page.id}`)).status).toBe(404)
    const [log] = await getDb()
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "builder-page.deleted"))
    expect(log.entityId).toBe(page.id)
  })

  it("redirectHome on an unpublished page records nothing", async () => {
    const page = await create(editor)
    const res = await call(
      editor,
      `/${page.id}?version=${page.version}&redirectHome=true`,
      "DELETE"
    )
    expect(res.status).toBe(200)
    expect(await getDb().select().from(redirects)).toHaveLength(0)
  })
})

describe("media usages", () => {
  it("a block image blocks media delete (409) until the block is removed", async () => {
    const page = await create(editor)
    const saved = await saveDraft(editor, page, [heroPage("hero-1")])
    expect(
      await listMediaUsagesFor(getDb(), "builder-page", page.id)
    ).toHaveLength(1)
    const blocked = await adminRequest(`/media/${imageId}`, {
      cookie: owner.cookie,
      method: "DELETE",
    })
    expect(blocked.status).toBe(409)
    await saveDraft(editor, saved, [richtext("text-1", "intro")])
    expect(
      await listMediaUsagesFor(getDb(), "builder-page", page.id)
    ).toHaveLength(0)
    const freed = await adminRequest(`/media/${imageId}`, {
      cookie: owner.cookie,
      method: "DELETE",
    })
    expect(freed.status).toBe(200)
  })

  it("an image in a seed counts on create; deleting the page frees it", async () => {
    const page = await create(editor, "seeded", {
      blocks: [heroPage("hero-1")],
    })
    expect(
      await listMediaUsagesFor(getDb(), "builder-page", page.id)
    ).toHaveLength(1)
    await call(editor, `/${page.id}?version=${page.version}`, "DELETE")
    expect(
      await listMediaUsagesFor(getDb(), "builder-page", page.id)
    ).toHaveLength(0)
  })

  it("a draft that references a missing media row is 422", async () => {
    const page = await create(editor)
    const res = await call(editor, `/${page.id}/draft`, "PUT", {
      draft: { blocks: [heroPage("hero-1", crypto.randomUUID())] },
      version: page.version,
    })
    expect(res.status).toBe(422)
  })
})

describe("roles", () => {
  it("owner, admin and editor create and delete", async () => {
    for (const [i, who] of [owner, admin, editor].entries()) {
      const page = await create(who, `by-role-${i}`)
      const res = await call(
        who,
        `/${page.id}?version=${page.version}`,
        "DELETE"
      )
      expect(res.status).toBe(200)
    }
  })

  it("marketer and viewer read only", async () => {
    const page = await create(editor)
    for (const who of [marketer, viewer]) {
      expect((await call(who, "")).status).toBe(200)
      expect((await call(who, `/${page.id}`)).status).toBe(200)
      expect(
        (await call(who, "", "POST", { slug: "nope", title: "No" })).status
      ).toBe(403)
      expect(
        (
          await call(who, `/${page.id}/draft`, "PUT", {
            draft: { blocks: [] },
            version: 1,
          })
        ).status
      ).toBe(403)
      expect(
        (await call(who, `/${page.id}/publish`, "POST", { version: 1 })).status
      ).toBe(403)
      expect(
        (
          await call(who, `/${page.id}/meta`, "PATCH", {
            title: "T",
            version: 1,
          })
        ).status
      ).toBe(403)
      expect((await call(who, `/${page.id}?version=1`, "DELETE")).status).toBe(
        403
      )
    }
  })

  it("an author gets 403 on GET", async () => {
    const page = await create(editor)
    expect((await call(author, "")).status).toBe(403)
    expect((await call(author, `/${page.id}`)).status).toBe(403)
  })

  it("lists pages with search", async () => {
    await create(editor, "alpha")
    await create(editor, "beta")
    const res = await call(viewer, "?q=alp")
    const body = await json<Paginated<BuilderPageDto>>(res)
    expect(body.total).toBe(1)
    expect(body.items[0].slug).toBe("alpha")
    expect(body.items[0]).not.toHaveProperty("draft")
  })
})
