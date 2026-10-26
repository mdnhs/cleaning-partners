import { beforeEach, describe, expect, it, vi } from "vitest"

const repo = vi.hoisted(() => ({
  findRedirectByFrom: vi.fn(),
  incrementRedirectHits: vi.fn(),
  isPublishedSlug: vi.fn(),
}))
vi.mock("@/server/modules/redirects/repo", () => repo)
vi.mock("@/server/db/client", () => ({ getDb: vi.fn(() => ({})) }))

import { resolvePublicPath } from "@/server/modules/redirects/resolve"

const live = { draft: false }

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset()
  repo.findRedirectByFrom.mockResolvedValue(null)
  repo.isPublishedSlug.mockResolvedValue(false)
})

describe("resolvePublicPath for /p/:slug", () => {
  it("a published builder slug passes", async () => {
    repo.isPublishedSlug.mockResolvedValueOnce(true)
    expect(await resolvePublicPath("/p/spring-offer", live)).toEqual({
      kind: "pass",
    })
    expect(repo.isPublishedSlug).toHaveBeenCalledWith(
      {},
      "builder",
      "spring-offer"
    )
  })

  it("an unknown or malformed slug is missing, without a lookup when malformed", async () => {
    expect(await resolvePublicPath("/p/nope", live)).toEqual({
      kind: "missing",
    })
    repo.isPublishedSlug.mockClear()
    expect(await resolvePublicPath("/p/Not_A_Slug", live)).toEqual({
      kind: "missing",
    })
    expect(repo.isPublishedSlug).not.toHaveBeenCalled()
  })

  it("a draft cookie passes without a query", async () => {
    expect(await resolvePublicPath("/p/anything", { draft: true })).toEqual({
      kind: "pass",
    })
    expect(repo.isPublishedSlug).not.toHaveBeenCalled()
  })

  it("a redirect wins over the 404", async () => {
    repo.findRedirectByFrom.mockResolvedValue({
      id: "r1",
      toPath: "/p/new",
      code: 301,
    })
    expect(await resolvePublicPath("/p/old", live)).toMatchObject({
      kind: "redirect",
      to: "/p/new",
      code: 301,
    })
  })

  it("/p itself and deeper paths keep the old behaviour (pass)", async () => {
    expect(await resolvePublicPath("/p", live)).toEqual({ kind: "pass" })
    expect(await resolvePublicPath("/p/a/b", live)).toEqual({ kind: "pass" })
  })
})
