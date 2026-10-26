import { beforeEach, describe, expect, it, vi } from "vitest"

const { cacheTag, preview } = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  preview: { on: false },
}))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag }))
vi.mock("@/server/modules/preview/guard", () => ({
  isPreviewing: async () => preview.on,
}))

import { DEFAULT_THEME, ThemeConfig } from "@/lib/theme/schema"
import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"
import {
  getPreviewableSiteTheme,
  getPublishedTheme,
} from "@/server/modules/theme/queries"

import { resetDb } from "../db"

const draft = ThemeConfig.parse({ site: { brand: "#1d4ed8" } })
const published = ThemeConfig.parse({ admin: { radius: 1 } })

beforeEach(async () => {
  await resetDb()
  preview.on = false
  cacheTag.mockClear()
})

describe("theme queries", () => {
  it("getPublishedTheme: the published value, tagged settings:theme", async () => {
    await getDb().insert(settings).values({ key: "theme", draft, published })
    expect(await getPublishedTheme()).toEqual(published)
    expect(cacheTag).toHaveBeenCalledWith("settings:theme")
  })

  it("getPublishedTheme: default when the row is missing or unpublished", async () => {
    expect(await getPublishedTheme()).toEqual(DEFAULT_THEME)
    await getDb().insert(settings).values({ key: "theme", draft })
    expect(await getPublishedTheme()).toEqual(DEFAULT_THEME)
  })

  it("getPreviewableSiteTheme: the draft site for a previewer, else the published one", async () => {
    await getDb().insert(settings).values({ key: "theme", draft, published })
    expect(await getPreviewableSiteTheme()).toEqual(published.site)
    preview.on = true
    expect(await getPreviewableSiteTheme()).toEqual(draft.site)
  })
})
