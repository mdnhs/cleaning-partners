import { beforeEach, describe, expect, it, vi } from "vitest"

const m = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  loadLogo: vi.fn(),
}))
vi.mock("next/cache", () => ({ cacheLife: m.cacheLife, cacheTag: m.cacheTag }))
vi.mock("next/og", () => ({
  ImageResponse: class {
    arrayBuffer = async () => new ArrayBuffer(4)
  },
}))
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("font")),
}))
vi.mock("@/server/lib/site-origin", () => ({
  publicOrigin: () => "https://cleaningpartners.ie",
}))
vi.mock("@/server/modules/seo/og-logo", () => ({ loadLogo: m.loadLogo }))
vi.mock("@/server/modules/seo/queries", () => ({
  getOgSubject: vi.fn(async () => ({
    title: "Medical Cleaning",
    siteName: "Cleaning Partners Ltd.",
    productionUrl: null,
  })),
  getOgLogo: vi.fn(async () => ({ mediaId: "m1" })),
  ogSubjectTags: () => ["t"],
}))

import { renderOgCard } from "@/app/og/[kind]/[slug]/card"

beforeEach(() => {
  m.cacheLife.mockClear()
})

describe("renderOgCard cache life", () => {
  it("a transient logo failure is cached for minutes", async () => {
    m.loadLogo.mockResolvedValue({ image: null, transient: true })
    await renderOgCard("service", "medical-cleaning")
    expect(m.cacheLife.mock.calls).toEqual([["minutes"]])
  })

  it("otherwise the card is cached at max", async () => {
    m.loadLogo.mockResolvedValue({ image: null, transient: false })
    await renderOgCard("service", "medical-cleaning")
    expect(m.cacheLife.mock.calls).toEqual([["max"]])
  })
})
