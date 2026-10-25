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
  getPage,
  publishPage,
  savePageDraft,
} from "@/server/modules/pages/service"

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
