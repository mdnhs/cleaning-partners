import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))
const { who } = vi.hoisted(() => ({ who: { roles: [] as string[] } }))
vi.mock("@/server/modules/preview/guard", async () => {
  const { hasPermission } = await import("@/lib/auth/permissions")
  return {
    // A verified previewer entered through `who.roles`: draft mode alone
    // never widens what the roles can read.
    previewerCan: async (req: Parameters<typeof hasPermission>[1]) =>
      hasPermission(who.roles, req),
  }
})

import type { Actor } from "@/server/lib/actor"
import { getDb } from "@/server/db/client"
import { builderPages } from "@/server/db/schema"
import { getBuilderPageForRequest } from "@/server/modules/builder-pages/queries"
import { previewPath } from "@/server/modules/preview/service"

import { resetDb } from "../db"

const actor = (roles: string[]) => ({ userId: "u", roles }) as unknown as Actor
let id: string

beforeEach(async () => {
  await resetDb()
  const [row] = await getDb()
    .insert(builderPages)
    .values({
      slug: "coming-soon",
      title: "Coming soon",
      draft: {
        blocks: [
          {
            id: "text-1",
            type: "richtext",
            anchor: "intro",
            hidden: false,
            data: { doc: { type: "doc", content: [] } },
          },
        ],
      },
    })
    .returning({ id: builderPages.id })
  id = row.id
})

describe("preview scope for builder pages", () => {
  it("an editor's preview resolves to /p/<slug> and shows the draft", async () => {
    expect(await previewPath(actor(["editor"]), "builder-page", id)).toBe(
      "/p/coming-soon"
    )
    who.roles = ["editor"]
    expect(await getBuilderPageForRequest("coming-soon")).not.toBeNull()
  })

  it("an author (article preview, no page:read) sees no builder draft", async () => {
    expect(
      await previewPath(
        actor(["author"]),
        "article",
        "00000000-0000-4000-8000-000000000000"
      ).catch(() => "no-article")
    ).toBe("no-article")
    who.roles = ["author"]
    expect(await getBuilderPageForRequest("coming-soon")).toBeNull()
  })

  it("previewing a builder page needs page:read; bad and unknown ids are 404", async () => {
    await expect(
      previewPath(actor(["author"]), "builder-page", id)
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    for (const bad of ["not-a-uuid", "00000000-0000-4000-8000-000000000000"])
      await expect(
        previewPath(actor(["editor"]), "builder-page", bad)
      ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
