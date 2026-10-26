import { beforeEach, describe, expect, it, vi } from "vitest"

// Outside Next, record which cache tags get expired.
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag,
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import { getDb } from "@/server/db/client"
import { seedContent } from "@/server/db/seed"
import type { Actor } from "@/server/lib/actor"
import { tag } from "@/server/lib/cache-tags"
import {
  createCollectionItem,
  deleteCollectionItem,
  listCollection,
  updateCollectionItem,
} from "@/server/modules/collections/service"
import {
  getPage,
  publishPage,
  savePageDraft,
} from "@/server/modules/pages/service"
import { reorder } from "@/server/modules/reorder/service"
import {
  getServiceAdmin,
  listServicesAdmin,
  publishService,
  saveServiceDraft,
} from "@/server/modules/services/service"

import { resetDb } from "../db"
import { signedInUser } from "../helpers/auth"

let owner: Actor

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  const { user } = await signedInUser(["owner"])
  owner = {
    userId: user.id,
    roles: ["owner"],
    ip: null,
    userAgent: null,
    impersonatorId: null,
  }
  revalidateTag.mockClear()
})

describe("publish-path invalidation proof (R4-7, Phase 3 Task 9 deferral)", () => {
  it("publishing pages.home through the pages service expires tag.page('home')", async () => {
    const home = await getPage(owner, "home")
    const saved = await savePageDraft(owner, "home", {
      draft: home.draft,
      version: home.version,
    })
    // A draft save never touches the public cache.
    expect(revalidateTag).not.toHaveBeenCalled()

    await publishPage(owner, "home", { version: saved.version })
    expect(tag.page("home")).toBe("page:home")
    expect(revalidateTag).toHaveBeenCalledWith(tag.page("home"), { expire: 0 })
  })
})

describe("publish-path invalidation proof: services, testimonials, categories (R4-8)", () => {
  it("publishing a service through the services service expires tag.services and tag.service(slug)", async () => {
    const { items } = await listServicesAdmin(owner, {
      q: "medical",
      page: 1,
      pageSize: 10,
      sort: { field: "sortOrder", dir: "asc" },
    })
    const svc = await getServiceAdmin(owner, items[0].id)
    const saved = await saveServiceDraft(owner, svc.id, {
      draft: svc.draft,
      version: svc.version,
    })
    expect(revalidateTag).not.toHaveBeenCalled()

    await publishService(owner, svc.id, { version: saved.version })
    expect(revalidateTag.mock.calls).toEqual([
      [tag.services, { expire: 0 }],
      [tag.service("medical-cleaning"), { expire: 0 }],
    ])
  })

  it("writing a testimonial through the collections service expires tag.testimonials", async () => {
    const created = await createCollectionItem(owner, "testimonials", {
      name: "Proof Person",
      initials: "PP",
      quote: "Proof.",
      rating: 3,
    })
    expect(revalidateTag).toHaveBeenLastCalledWith(tag.testimonials, {
      expire: 0,
    })
    revalidateTag.mockClear()
    await updateCollectionItem(owner, "testimonials", created.id, {
      name: "Proof Person",
      initials: "PP",
      quote: "Proof 2.",
      rating: 4,
    })
    expect(revalidateTag).toHaveBeenCalledWith(tag.testimonials, { expire: 0 })
    revalidateTag.mockClear()
    await deleteCollectionItem(owner, "testimonials", created.id)
    expect(revalidateTag).toHaveBeenCalledWith(tag.testimonials, { expire: 0 })
  })

  it("writing and reordering categories expires tag.categories", async () => {
    const created = await createCollectionItem(owner, "categories", {
      slug: "proof",
      name: "Proof",
      showInFilter: false,
    })
    expect(revalidateTag).toHaveBeenLastCalledWith(tag.categories, {
      expire: 0,
    })
    revalidateTag.mockClear()
    const { items } = await listCollection(owner, "categories", {
      q: "",
      page: 1,
      pageSize: 50,
      sort: { field: "sortOrder", dir: "asc" },
    })
    await reorder(
      owner,
      "categories",
      items.map((c) => c.id)
    )
    expect(revalidateTag).toHaveBeenCalledWith(tag.categories, { expire: 0 })
    revalidateTag.mockClear()
    await deleteCollectionItem(owner, "categories", created.id)
    expect(revalidateTag).toHaveBeenCalledWith(tag.categories, { expire: 0 })
  })
})
