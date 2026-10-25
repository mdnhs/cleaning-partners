import { beforeEach, describe, expect, it, vi } from "vitest"

const { cacheTag } = vi.hoisted(() => ({ cacheTag: vi.fn() }))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag }))

import { DEFAULT_THEME, ThemeConfig } from "@/lib/theme/schema"
import { getDb } from "@/server/db/client"
import { settings } from "@/server/db/schema"
import { getPublishedTheme } from "@/server/modules/theme/queries"

import { resetDb } from "../db"

const draft = ThemeConfig.parse({ site: { brand: "#1d4ed8" } })
const published = ThemeConfig.parse({ admin: { radius: 1 } })

beforeEach(async () => {
  await resetDb()
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
})
