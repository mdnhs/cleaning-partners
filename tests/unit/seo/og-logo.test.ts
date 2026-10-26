import { beforeEach, describe, expect, it, vi } from "vitest"

const { read, storageFor } = vi.hoisted(() => {
  const read = vi.fn()
  return { read, storageFor: vi.fn(async () => ({ read })) }
})
vi.mock("@/server/lib/storage", () => ({
  storageFor,
  staticFilePath: (key: string) => key,
}))

import { LOGO_MAX_BYTES, loadLogo } from "@/server/modules/seo/og-logo"
import type { OgLogo } from "@/server/modules/seo/queries"

const logo = (over: Partial<OgLogo> = {}): OgLogo => ({
  driver: "disk",
  key: "logo.png",
  mime: "image/png",
  width: 360,
  height: 72,
  size: 1000,
  mediaId: "m1",
  ...over,
})

beforeEach(() => {
  read.mockReset()
})

describe("og logo loader (share card)", () => {
  it("inlines a readable logo as a data URI", async () => {
    read.mockResolvedValue(new Uint8Array([1, 2, 3]))
    const out = await loadLogo(logo())
    expect(out.transient).toBe(false)
    expect(out.image).toMatchObject({
      src: "data:image/png;base64,AQID",
      height: 72,
    })
  })

  it("no logo or an undrawable format prints the site name, not transient", async () => {
    expect(await loadLogo(null)).toEqual({ image: null, transient: false })
    expect(await loadLogo(logo({ mime: "image/webp" }))).toEqual({
      image: null,
      transient: false,
    })
    expect(read).not.toHaveBeenCalled()
  })

  it("a storage error is transient: the card renders without the logo and is cached briefly", async () => {
    read.mockRejectedValue(new Error("r2 down"))
    expect(await loadLogo(logo({ driver: "r2" }))).toEqual({
      image: null,
      transient: true,
    })
    read.mockResolvedValue(null)
    expect((await loadLogo(logo())).transient).toBe(true)
  })

  it("a logo over 2 MB is never read and falls back to the text card", async () => {
    const out = await loadLogo(logo({ size: LOGO_MAX_BYTES + 1 }))
    expect(out).toEqual({ image: null, transient: false })
    expect(read).not.toHaveBeenCalled()
  })

  it("bytes over 2 MB fall back too, whatever the stored size says", async () => {
    read.mockResolvedValue(new Uint8Array(LOGO_MAX_BYTES + 1))
    expect(await loadLogo(logo({ size: 10 }))).toEqual({
      image: null,
      transient: false,
    })
    read.mockResolvedValue(new Uint8Array(LOGO_MAX_BYTES))
    expect((await loadLogo(logo({ size: 10 }))).image).not.toBeNull()
  })
})
