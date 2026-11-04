import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Hono runs outside Next here: record invalidations instead of revalidating.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import type { PageDto } from "@/lib/schemas/api/content"
import { getDb } from "@/server/db/client"
import { media } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { listMediaUsagesFor } from "@/server/modules/media/repo"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

type Hero = {
  background: { mediaId: string }
  backgroundVideo?: { mediaId: string } | null
}
type HomeDraft = { hero: Hero }
type ErrorBody = { error: { fieldErrors?: Record<string, string[]> } }

let editor: string
let videoId: string
let imageId: string

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
  editor = (await signedInUser(["editor"])).cookie
  const [video] = await getDb()
    .insert(media)
    .values({
      key: "/videos/hero-loop.mp4",
      driver: "static",
      mime: "video/mp4",
      size: 1,
    })
    .returning({ id: media.id })
  videoId = video.id
  const [image] = await getDb()
    .select({ id: media.id })
    .from(media)
    .where(eq(media.mime, "image/png"))
    .limit(1)
  imageId = image.id
})

async function home() {
  const res = await adminRequest("/pages/home", { cookie: editor })
  return (await res.json()) as PageDto
}

async function saveHero(patch: Partial<Hero>) {
  const page = await home()
  const draft = structuredClone(page.draft) as HomeDraft
  Object.assign(draft.hero, patch)
  return adminRequest("/pages/home/draft", {
    cookie: editor,
    method: "PUT",
    json: { draft, version: page.version },
  })
}

describe("the home hero's background video", () => {
  it("takes a library video, tracks it as used and keeps it out of image fields", async () => {
    const res = await saveHero({ backgroundVideo: { mediaId: videoId } })
    expect(res.status).toBe(200)
    expect(
      ((await res.json()) as PageDto).draft as unknown as HomeDraft
    ).toMatchObject({ hero: { backgroundVideo: { mediaId: videoId } } })
    const usages = await listMediaUsagesFor(getDb(), "page", "home")
    expect(
      usages.filter((u) => u.mediaId === videoId).map((u) => u.field)
    ).toEqual(["hero.backgroundVideo"])
  })

  it("refuses an image in the video field", async () => {
    const res = await saveHero({ backgroundVideo: { mediaId: imageId } })
    expect(res.status).toBe(422)
    expect(
      ((await res.json()) as ErrorBody).error.fieldErrors?.[
        "hero.backgroundVideo"
      ]?.[0]
    ).toMatch(/not a video/i)
  })

  it("refuses a video in an image field", async () => {
    const res = await saveHero({ background: { mediaId: videoId } })
    expect(res.status).toBe(422)
    expect(
      ((await res.json()) as ErrorBody).error.fieldErrors?.["hero.background"]
    ).toBeDefined()
  })

  it("can be cleared again", async () => {
    await saveHero({ backgroundVideo: { mediaId: videoId } })
    const res = await saveHero({ backgroundVideo: null })
    expect(res.status).toBe(200)
    const usages = await listMediaUsagesFor(getDb(), "page", "home")
    expect(usages.some((u) => u.mediaId === videoId)).toBe(false)
  })
})
