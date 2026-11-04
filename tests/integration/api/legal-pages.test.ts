import { beforeEach, describe, expect, it, vi } from "vitest"

// Hono runs outside Next here: record invalidations instead of revalidating.
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

// No draft-mode request here: a visitor, never a previewer.
vi.mock("@/server/modules/preview/guard", () => ({
  previewerCan: vi.fn().mockResolvedValue(false),
}))

import type { BuilderPageDto } from "@/lib/schemas/api/builder-pages"
import type { Paginated } from "@/lib/schemas/api/list"
import { tag } from "@/server/lib/cache-tags"
import {
  getLegalPageForRequest,
  listLegalLinks,
} from "@/server/modules/builder-pages/queries"
import { resolvePublicPath } from "@/server/modules/redirects/resolve"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

type Who = { cookie: string; user: { id: string } }
type ErrorBody = {
  error: { code: string; fieldErrors?: Record<string, string[]> }
}

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
  adminRequest(`/builder-pages${path}`, {
    cookie: who.cookie,
    method,
    json: body,
  })

async function createLegal(who: Who, title: string, slug: string) {
  const res = await call(who, "", "POST", { title, slug, legal: true })
  expect(res.status).toBe(201)
  return json<BuilderPageDto>(res)
}

/** Fills the starter (hero intro + one paragraph) so the page can publish. */
async function publishLegal(who: Who, page: BuilderPageDto) {
  const [hero, text] = page.draft.blocks as { data: Record<string, unknown> }[]
  const draft = {
    blocks: [
      { ...page.draft.blocks[0], data: { ...hero.data, description: "Intro" } },
      {
        ...page.draft.blocks[1],
        data: {
          ...text.data,
          doc: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Body" }] },
            ],
          },
        },
      },
    ],
  }
  const saved = await call(who, `/${page.id}/draft`, "PUT", {
    draft,
    version: page.version,
  })
  expect(saved.status).toBe(200)
  const version = (await json<BuilderPageDto>(saved)).version
  const res = await call(who, `/${page.id}/publish`, "POST", { version })
  expect(res.status).toBe(200)
  return json<BuilderPageDto>(res)
}

const list = async (who: Who, kind: "custom" | "legal") =>
  (await json<Paginated<BuilderPageDto>>(await call(who, `?kind=${kind}`)))
    .items

describe("create", () => {
  it("a legal page is a draft at the site root, starting with a hero and a text block", async () => {
    const page = await createLegal(editor, "Cookie Policy", "cookie-policy")
    expect(page).toMatchObject({
      slug: "cookie-policy",
      path: "/cookie-policy",
      legalOrder: 0,
      status: "draft",
      published: null,
    })
    expect(page.draft.blocks.map((b) => b.type)).toEqual([
      "hero.page",
      "richtext",
    ])
  })

  it("new legal pages join the end of the footer order", async () => {
    const a = await createLegal(editor, "Privacy Policy", "privacy-policy")
    const b = await createLegal(editor, "Cookie Policy", "cookie-policy")
    expect([a.legalOrder, b.legalOrder]).toEqual([0, 1])
  })

  it("refuses addresses the site already uses", async () => {
    for (const slug of [
      "about",
      "blog",
      "admin",
      "api",
      "contact",
      "services",
    ]) {
      const res = await call(editor, "", "POST", {
        title: "X",
        slug,
        legal: true,
      })
      expect(res.status, slug).toBe(422)
      expect((await json<ErrorBody>(res)).error.fieldErrors?.slug).toBeDefined()
    }
  })

  it("privacy and terms are ordinary legal addresses (there are no fixed pages for them)", async () => {
    for (const slug of ["privacy", "terms"]) {
      const res = await call(editor, "", "POST", {
        title: slug,
        slug,
        legal: true,
      })
      expect(res.status, slug).toBe(201)
    }
  })

  it("a viewer cannot create one", async () => {
    const res = await call(viewer, "", "POST", {
      title: "X",
      slug: "x-policy",
      legal: true,
    })
    expect(res.status).toBe(403)
  })
})

describe("lists", () => {
  it("custom and legal pages are listed apart; legal ones in footer order", async () => {
    await createLegal(editor, "Terms of Service", "terms-of-service")
    await createLegal(editor, "Privacy Policy", "privacy-policy")
    const custom = await call(editor, "", "POST", {
      title: "Spring",
      slug: "spring",
    })
    expect(custom.status).toBe(201)
    expect((await list(editor, "custom")).map((p) => p.slug)).toEqual([
      "spring",
    ])
    expect((await list(editor, "legal")).map((p) => p.slug)).toEqual([
      "terms-of-service",
      "privacy-policy",
    ])
  })
})

describe("reorder", () => {
  it("saves the new footer order", async () => {
    const a = await createLegal(editor, "Privacy Policy", "privacy-policy")
    const b = await createLegal(editor, "Cookie Policy", "cookie-policy")
    const res = await call(editor, "/legal-order", "PUT", { ids: [b.id, a.id] })
    expect(res.status).toBe(200)
    expect((await list(editor, "legal")).map((p) => p.slug)).toEqual([
      "cookie-policy",
      "privacy-policy",
    ])
    expect(revalidateTag).toHaveBeenCalledWith(
      tag.legalPages,
      expect.anything()
    )
  })

  it("answers 409 when the list is not exactly the current pages", async () => {
    const a = await createLegal(editor, "Privacy Policy", "privacy-policy")
    await createLegal(editor, "Cookie Policy", "cookie-policy")
    const res = await call(editor, "/legal-order", "PUT", { ids: [a.id] })
    expect(res.status).toBe(409)
  })

  it("a viewer cannot reorder", async () => {
    const a = await createLegal(editor, "Privacy Policy", "privacy-policy")
    const res = await call(viewer, "/legal-order", "PUT", { ids: [a.id] })
    expect(res.status).toBe(403)
  })
})

describe("publishing and the public site", () => {
  it("a draft is not live; a published page is, only at its root address", async () => {
    const page = await createLegal(editor, "Cookie Policy", "cookie-policy")
    expect(await resolvePublicPath("/cookie-policy", { draft: false })).toEqual(
      { kind: "missing" }
    )
    expect(await getLegalPageForRequest("cookie-policy")).toBeNull()

    await publishLegal(editor, page)
    expect(await resolvePublicPath("/cookie-policy", { draft: false })).toEqual(
      { kind: "pass" }
    )
    expect(await getLegalPageForRequest("cookie-policy")).toMatchObject({
      slug: "cookie-policy",
      legal: true,
    })
    // Not served under /p.
    expect(
      await resolvePublicPath("/p/cookie-policy", { draft: false })
    ).toEqual({ kind: "missing" })
  })

  it("the site's own single-segment routes are never treated as legal pages", async () => {
    for (const path of ["/about", "/blog", "/contact", "/services", "/admin"])
      expect(await resolvePublicPath(path, { draft: false })).toEqual({
        kind: "pass",
      })
  })

  it("the footer lists only published legal pages, in the admin's order", async () => {
    const privacy = await createLegal(
      editor,
      "Privacy Policy",
      "privacy-policy"
    )
    const cookies = await createLegal(editor, "Cookie Policy", "cookie-policy")
    await createLegal(editor, "Draft Policy", "draft-policy")
    await publishLegal(editor, privacy)
    await publishLegal(editor, cookies)
    await call(editor, "/legal-order", "PUT", {
      ids: (await list(editor, "legal"))
        .map((p) => p.id)
        .sort((a) => (a === cookies.id ? -1 : 0)),
    })
    expect(await listLegalLinks()).toEqual([
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ])
  })

  it("renaming a published page leaves a 301 from the old root address", async () => {
    const page = await publishLegal(
      editor,
      await createLegal(editor, "Cookie Policy", "cookie-policy")
    )
    const res = await call(editor, `/${page.id}/meta`, "PATCH", {
      slug: "cookies",
      version: page.version,
    })
    expect(res.status).toBe(200)
    expect(
      await resolvePublicPath("/cookie-policy", { draft: false })
    ).toMatchObject({ kind: "redirect", to: "/cookies", code: 301 })
  })

  it("renaming to a reserved address is refused", async () => {
    const page = await createLegal(editor, "Cookie Policy", "cookie-policy")
    const res = await call(editor, `/${page.id}/meta`, "PATCH", {
      slug: "about",
      version: page.version,
    })
    expect(res.status).toBe(422)
  })

  it("deleting removes it from the footer, and can send the address home", async () => {
    const page = await publishLegal(
      editor,
      await createLegal(editor, "Cookie Policy", "cookie-policy")
    )
    const res = await call(
      editor,
      `/${page.id}?version=${page.version}&redirectHome=true`,
      "DELETE"
    )
    expect(res.status).toBe(200)
    expect(await listLegalLinks()).toEqual([])
    expect(
      await resolvePublicPath("/cookie-policy", { draft: false })
    ).toMatchObject({ kind: "redirect", to: "/" })
  })
})
