import { and, eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type {
  CategoryItem,
  ClientItem,
  TeamItem,
  TestimonialItem,
} from "@/lib/schemas/api/collections"
import type { Paginated } from "@/lib/schemas/api/list"
import type { ServiceDto, ServiceListItem } from "@/lib/schemas/api/services"
import { getDb } from "@/server/db/client"
import {
  auditLog,
  clients,
  media,
  redirects,
  revisions,
  services,
} from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { listMediaUsagesFor } from "@/server/modules/media/repo"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

let editor: string
let viewer: string
let author: string
let logoId: string

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  editor = (await signedInUser(["editor"])).cookie
  viewer = (await signedInUser(["viewer"])).cookie
  author = (await signedInUser(["author"])).cookie
  const [logo] = await getDb()
    .select()
    .from(media)
    .where(eq(media.key, "/images/home/client-hse.png"))
  logoId = logo.id
  revalidateTag.mockClear()
})

const json = async <T>(res: Response) => (await res.json()) as T

describe("small collections (master 4.6, R4-3): immediate publish + revision + audit + tag", () => {
  it("lists team members with server pagination, search and sort", async () => {
    const page1 = await json<Paginated<TeamItem>>(
      await adminRequest("/team?pageSize=2&sort=name:asc", { cookie: viewer })
    )
    expect(page1.total).toBe(3)
    expect(page1.items.map((t) => t.name)).toEqual([
      "John McDonald",
      "Michael McDonald",
    ])
    const search = await json<Paginated<TeamItem>>(
      await adminRequest("/team?q=moran", { cookie: viewer })
    )
    expect(search.items.map((t) => t.name)).toEqual(["Sarah Moran"])
  })

  it("creates, updates and deletes a client; revisions count up per entity", async () => {
    const created = await adminRequest("/clients", {
      cookie: editor,
      method: "POST",
      json: {
        name: "Acme Retail",
        logo: { mediaId: logoId },
        url: "https://acme.example",
      },
    })
    expect(created.status).toBe(201)
    const client = await json<ClientItem>(created)
    expect(client).toMatchObject({
      name: "Acme Retail",
      url: "https://acme.example",
      logo: { mediaId: logoId },
    })
    expect(revalidateTag).toHaveBeenCalledWith("clients", { expire: 0 })
    expect(await listMediaUsagesFor(getDb(), "client", client.id)).toEqual([
      { mediaId: logoId, field: "logo" },
    ])

    const updated = await adminRequest(`/clients/${client.id}`, {
      cookie: editor,
      method: "PUT",
      json: { name: "Acme Retail Ltd", logo: { mediaId: logoId }, url: null },
    })
    expect((await json<ClientItem>(updated)).url).toBeNull()
    const revs = await getDb()
      .select({ version: revisions.version })
      .from(revisions)
      .where(
        and(
          eq(revisions.entityType, "client"),
          eq(revisions.entityId, client.id)
        )
      )
    expect(revs.map((r) => r.version).sort()).toEqual([1, 2])

    expect(
      (
        await adminRequest(`/clients/${client.id}`, {
          cookie: editor,
          method: "DELETE",
        })
      ).status
    ).toBe(200)
    expect(await listMediaUsagesFor(getDb(), "client", client.id)).toEqual([])
    expect(
      (await adminRequest(`/clients/${client.id}`, { cookie: editor })).status
    ).toBe(404)
  })

  it("rejects invalid input (422) and duplicate names (409)", async () => {
    const bad = await adminRequest("/team", {
      cookie: editor,
      method: "POST",
      json: { name: "", role: "x", bio: "", photo: null },
    })
    expect(bad.status).toBe(422)
    expect(
      Object.keys(
        (await json<{ error: { fieldErrors: object } }>(bad)).error.fieldErrors
      ).sort()
    ).toEqual(["bio", "name"])
    const dup = await adminRequest("/team", {
      cookie: editor,
      method: "POST",
      json: {
        name: "Sarah Moran",
        role: "x",
        bio: "x",
        photo: null,
      },
    })
    expect(dup.status).toBe(409)
    expect(
      (await json<{ error: { fieldErrors: Record<string, string[]> } }>(dup))
        .error.fieldErrors.name
    ).toBeTruthy()
    const javascriptUrl = await adminRequest("/clients", {
      cookie: editor,
      method: "POST",
      json: {
        name: "X",
        logo: { mediaId: logoId },
        url: "javascript:alert(1)",
      },
    })
    expect(javascriptUrl.status).toBe(422)
  })

  it("rejects a logo missing from the media library (422 on the field)", async () => {
    const res = await adminRequest("/clients", {
      cookie: editor,
      method: "POST",
      json: {
        name: "Ghost Ltd",
        logo: { mediaId: "0190a5b0-0000-7000-8000-000000000000" },
        url: null,
      },
    })
    expect(res.status).toBe(422)
    expect(
      (await json<{ error: { fieldErrors: Record<string, string[]> } }>(res))
        .error.fieldErrors.logo
    ).toBeTruthy()
  })

  it("will not delete a category that has articles (409)", async () => {
    const { items } = await json<Paginated<CategoryItem>>(
      await adminRequest("/categories?pageSize=50", { cookie: editor })
    )
    const news = items.find((c) => c.slug === "commercial")!
    expect(news.articleCount).toBeGreaterThan(0)
    const res = await adminRequest(`/categories/${news.id}`, {
      cookie: editor,
      method: "DELETE",
    })
    expect(res.status).toBe(409)
    expect(
      (await json<{ error: { message: string } }>(res)).error.message
    ).toContain("Move them to another category")
    const dupSlug = await adminRequest("/categories", {
      cookie: editor,
      method: "POST",
      json: { slug: "commercial", name: "Dup", showInFilter: false },
    })
    expect(dupSlug.status).toBe(409)
  })

  it("requires collection permissions", async () => {
    expect((await adminRequest("/team", { cookie: author })).status).toBe(403)
    expect(
      (
        await adminRequest("/team", {
          cookie: viewer,
          method: "POST",
          json: {},
        })
      ).status
    ).toBe(403)
  })
})

describe("services (master 4.6): draft/publish, slug, delete", () => {
  const content = async () => {
    const [row] = await getDb()
      .select()
      .from(services)
      .where(eq(services.slug, "medical-cleaning"))
    return structuredClone(row.draft)
  }

  it("creates an unpublished draft at the end; slug clash → 409", async () => {
    const draft = { ...(await content()), title: "Pest Control" }
    const res = await adminRequest("/services", {
      cookie: editor,
      method: "POST",
      json: { slug: "pest-control", draft },
    })
    expect(res.status).toBe(201)
    const created = await json<ServiceDto>(res)
    expect(created).toMatchObject({
      slug: "pest-control",
      title: "Pest Control",
      version: 1,
      published: null,
      dirty: true,
      status: "draft",
    })
    const list = await json<Paginated<ServiceListItem>>(
      await adminRequest("/services?pageSize=50", { cookie: viewer })
    )
    expect(list.items.at(-1)?.slug).toBe("pest-control")
    expect(revalidateTag).not.toHaveBeenCalled()

    const clash = await adminRequest("/services", {
      cookie: editor,
      method: "POST",
      json: { slug: "pest-control", draft },
    })
    expect(clash.status).toBe(409)
    expect(
      (await json<{ error: { fieldErrors: Record<string, string[]> } }>(clash))
        .error.fieldErrors.slug
    ).toBeTruthy()
    const badSlug = await adminRequest("/services", {
      cookie: editor,
      method: "POST",
      json: { slug: "Pest Control", draft },
    })
    expect(badSlug.status).toBe(422)
  })

  it("records a redirect and expires the redirects tag on slug change/delete", async () => {
    const list = await json<Paginated<ServiceListItem>>(
      await adminRequest("/services?q=retail", { cookie: editor })
    )
    const { id } = list.items[0]
    // An editor has no redirect permission; the move still records.
    revalidateTag.mockClear()
    const moved = await adminRequest(`/services/${id}/slug`, {
      cookie: editor,
      method: "PATCH",
      json: { slug: "retail-cleaning-plus", version: 1 },
    })
    expect(moved.status).toBe(200)
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "services",
      "service:retail-cleaning",
      "service:retail-cleaning-plus",
      "redirects",
    ])
    const [slugMove] = await getDb()
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, "/services/retail-cleaning"))
    expect(slugMove).toMatchObject({
      toPath: "/services/retail-cleaning-plus",
      code: 301,
      source: "auto",
      isActive: true,
    })

    revalidateTag.mockClear()
    const removed = await adminRequest(`/services/${id}?version=2`, {
      cookie: editor,
      method: "DELETE",
    })
    expect(removed.status).toBe(200)
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "services",
      "service:retail-cleaning-plus",
      "redirects",
    ])
    const [deleted] = await getDb()
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, "/services/retail-cleaning-plus"))
    expect(deleted).toMatchObject({ toPath: "/services", source: "auto" })
    // The earlier hop was re-pointed at the deleted page's fallback, so the
    // old address still resolves in a single hop (no chain, no dead end).
    const [earlier] = await getDb()
      .select()
      .from(redirects)
      .where(eq(redirects.fromPath, "/services/retail-cleaning"))
    expect(earlier.toPath).toBe("/services")
    const all = await getDb().select().from(redirects)
    expect(all.map((r) => r.fromPath).sort()).toEqual([
      "/services/retail-cleaning",
      "/services/retail-cleaning-plus",
    ])
  })

  it("publishes (tags services + service:<slug>), changes the slug, rejects stale versions, deletes", async () => {
    const list = await json<Paginated<ServiceListItem>>(
      await adminRequest("/services?q=medical", { cookie: editor })
    )
    const id = list.items[0].id
    const draft = { ...(await content()), title: "Medical Cleaning Plus" }
    const saved = await json<ServiceDto>(
      await adminRequest(`/services/${id}/draft`, {
        cookie: editor,
        method: "PUT",
        json: { draft, version: 1 },
      })
    )
    expect(saved.version).toBe(2)
    const stale = await adminRequest(`/services/${id}/draft`, {
      cookie: editor,
      method: "PUT",
      json: { draft, version: 1 },
    })
    expect(stale.status).toBe(409)

    const published = await json<ServiceDto>(
      await adminRequest(`/services/${id}/publish`, {
        cookie: editor,
        method: "POST",
        json: { version: 2 },
      })
    )
    expect(published).toMatchObject({
      version: 3,
      dirty: false,
      title: "Medical Cleaning Plus",
    })
    expect(revalidateTag.mock.calls).toEqual([
      ["services", { expire: 0 }],
      ["service:medical-cleaning", { expire: 0 }],
    ])

    revalidateTag.mockClear()
    const moved = await json<ServiceDto>(
      await adminRequest(`/services/${id}/slug`, {
        cookie: editor,
        method: "PATCH",
        json: { slug: "medical-cleaning-plus", version: 3 },
      })
    )
    expect(moved).toMatchObject({ slug: "medical-cleaning-plus", version: 4 })
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual([
      "services",
      "service:medical-cleaning",
      "service:medical-cleaning-plus",
      "redirects",
    ])

    expect(
      (
        await adminRequest(`/services/${id}?version=3`, {
          cookie: editor,
          method: "DELETE",
        })
      ).status
    ).toBe(409)
    expect(
      (
        await adminRequest(`/services/${id}?version=4`, {
          cookie: viewer,
          method: "DELETE",
        })
      ).status
    ).toBe(403)
    expect(
      (
        await adminRequest(`/services/${id}?version=4`, {
          cookie: editor,
          method: "DELETE",
        })
      ).status
    ).toBe(200)
    expect(await listMediaUsagesFor(getDb(), "service", id)).toEqual([])
  })
})

describe("concurrent saves of one record (final review minor 2)", () => {
  it("queue up on the row: all succeed, one revision each, no false duplicate-name 409", async () => {
    const client = await json<ClientItem>(
      await adminRequest("/clients", {
        cookie: editor,
        method: "POST",
        json: { name: "Race Ltd", logo: { mediaId: logoId }, url: null },
      })
    )
    const statuses = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => {
        const res = await adminRequest(`/clients/${client.id}`, {
          cookie: editor,
          method: "PUT",
          json: {
            name: "Race Ltd",
            logo: { mediaId: logoId },
            url: `https://race.example/${i}`,
          },
        })
        return [res.status, await res.text()] as const
      })
    )
    expect(statuses.filter(([status]) => status !== 200)).toEqual([])
    const revs = await getDb()
      .select({ version: revisions.version })
      .from(revisions)
      .where(eq(revisions.entityId, client.id))
    expect(revs).toHaveLength(9)
    expect(await listMediaUsagesFor(getDb(), "client", client.id)).toEqual([
      { mediaId: logoId, field: "logo" },
    ])
  })
})

describe("PUT /reorder/:collection (master 4.6)", () => {
  it("persists sortOrder and invalidates the collection tag", async () => {
    const { items } = await json<Paginated<TeamItem>>(
      await adminRequest("/team", { cookie: editor })
    )
    const reversed = items.map((t) => t.id).reverse()
    const res = await adminRequest("/reorder/team", {
      cookie: editor,
      method: "PUT",
      json: { ids: reversed },
    })
    expect(res.status).toBe(200)
    const after = await json<Paginated<TeamItem>>(
      await adminRequest("/team", { cookie: editor })
    )
    expect(after.items.map((t) => t.id)).toEqual(reversed)
    expect(after.items.map((t) => t.sortOrder)).toEqual([0, 1, 2])
    expect(revalidateTag).toHaveBeenCalledWith("team", { expire: 0 })
  })

  it("concurrent saves of opposite orders never deadlock (final review minor 1)", async () => {
    await getDb()
      .insert(clients)
      .values(
        Array.from({ length: 60 }, (_, i) => ({
          name: `Reorder client ${i}`,
          logoId,
        }))
      )
    const ids = (await getDb().select({ id: clients.id }).from(clients)).map(
      (c) => c.id
    )
    const save = async (order: string[]) =>
      (
        await adminRequest("/reorder/clients", {
          cookie: editor,
          method: "PUT",
          json: { ids: order },
        })
      ).status
    for (let round = 0; round < 3; round++) {
      const statuses = await Promise.all([
        save(ids),
        save([...ids].reverse()),
        save(ids),
        save([...ids].reverse()),
      ])
      expect(statuses).toEqual([200, 200, 200, 200])
    }
  })

  it("409 when the list is out of date; 403 without update permission", async () => {
    const { items } = await json<Paginated<TeamItem>>(
      await adminRequest("/team", { cookie: editor })
    )
    const res = await adminRequest("/reorder/team", {
      cookie: editor,
      method: "PUT",
      json: { ids: items.slice(1).map((t) => t.id) },
    })
    expect(res.status).toBe(409)
    expect(
      (await json<{ error: { current: { ids: string[] } } }>(res)).error.current
        .ids
    ).toHaveLength(3)
    expect(
      (
        await adminRequest("/reorder/services", {
          cookie: viewer,
          method: "PUT",
          json: { ids: [items[0].id] },
        })
      ).status
    ).toBe(403)
  })
})

describe("testimonials (R4-3): CRUD, reorder, invalidate", () => {
  const body = (over: Record<string, unknown> = {}) => ({
    name: "Dana Byrne",
    initials: "DB",
    quote: "Spotless every time.",
    rating: 4,
    ...over,
  })

  it("lists the three seeded testimonials in display order", async () => {
    const page = await json<Paginated<TestimonialItem>>(
      await adminRequest("/testimonials", { cookie: viewer })
    )
    expect(page.items.map((t) => t.name)).toEqual([
      "Thomas Murray",
      "Charlotte Smith",
      "Stephanie Lyon",
    ])
    expect(page.items.every((t) => t.rating === 5)).toBe(true)
  })

  it("creates, updates and deletes; each write expires tag.testimonials and writes a revision", async () => {
    const created = await adminRequest("/testimonials", {
      cookie: editor,
      method: "POST",
      json: body(),
    })
    expect(created.status).toBe(201)
    const item = await json<TestimonialItem>(created)
    expect(item).toMatchObject({ name: "Dana Byrne", rating: 4, sortOrder: 3 })
    expect(revalidateTag).toHaveBeenLastCalledWith("testimonials", {
      expire: 0,
    })

    revalidateTag.mockClear()
    const updated = await adminRequest(`/testimonials/${item.id}`, {
      cookie: editor,
      method: "PUT",
      json: body({ rating: 5, quote: "Even better." }),
    })
    expect(await json<TestimonialItem>(updated)).toMatchObject({
      rating: 5,
      quote: "Even better.",
    })
    expect(revalidateTag).toHaveBeenCalledWith("testimonials", { expire: 0 })
    const revs = await getDb()
      .select({ version: revisions.version })
      .from(revisions)
      .where(
        and(
          eq(revisions.entityType, "testimonial"),
          eq(revisions.entityId, item.id)
        )
      )
    expect(revs.map((r) => r.version).sort()).toEqual([1, 2])

    revalidateTag.mockClear()
    expect(
      (
        await adminRequest(`/testimonials/${item.id}`, {
          cookie: editor,
          method: "DELETE",
        })
      ).status
    ).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith("testimonials", { expire: 0 })
    expect(
      (await adminRequest(`/testimonials/${item.id}`, { cookie: editor }))
        .status
    ).toBe(404)
    const audit = await getDb()
      .select({
        action: auditLog.action,
        entityType: auditLog.entityType,
      })
      .from(auditLog)
      .where(eq(auditLog.entityId, item.id))
      .orderBy(auditLog.createdAt, auditLog.id)
    expect(audit).toEqual([
      { action: "testimonial.created", entityType: "testimonial" },
      { action: "testimonial.updated", entityType: "testimonial" },
      { action: "testimonial.deleted", entityType: "testimonial" },
    ])
  })

  it.each([0, 6, 2.5])(
    "rejects rating %s with 422 on the rating field",
    async (rating) => {
      const res = await adminRequest("/testimonials", {
        cookie: editor,
        method: "POST",
        json: body({ rating }),
      })
      expect(res.status).toBe(422)
      expect(
        (await json<{ error: { fieldErrors: Record<string, string[]> } }>(res))
          .error.fieldErrors.rating
      ).toBeTruthy()
    }
  )

  it("rejects a duplicate name (409) and a missing quote (422)", async () => {
    const dup = await adminRequest("/testimonials", {
      cookie: editor,
      method: "POST",
      json: body({ name: "Thomas Murray" }),
    })
    expect(dup.status).toBe(409)
    const empty = await adminRequest("/testimonials", {
      cookie: editor,
      method: "POST",
      json: body({ quote: "" }),
    })
    expect(empty.status).toBe(422)
  })

  it("reorders and expires tag.testimonials; viewers cannot write", async () => {
    const { items } = await json<Paginated<TestimonialItem>>(
      await adminRequest("/testimonials", { cookie: editor })
    )
    const reversed = items.map((t) => t.id).reverse()
    revalidateTag.mockClear()
    const res = await adminRequest("/reorder/testimonials", {
      cookie: editor,
      method: "PUT",
      json: { ids: reversed },
    })
    expect(res.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith("testimonials", { expire: 0 })
    const after = await json<Paginated<TestimonialItem>>(
      await adminRequest("/testimonials", { cookie: editor })
    )
    expect(after.items.map((t) => t.id)).toEqual(reversed)

    expect(
      (
        await adminRequest("/testimonials", {
          cookie: viewer,
          method: "POST",
          json: body(),
        })
      ).status
    ).toBe(403)
    expect(
      (await adminRequest("/testimonials", { cookie: author })).status
    ).toBe(403)
  })
})
