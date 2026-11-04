import { describe, expect, it } from "vitest"

import { irishToday, isOpenJob } from "@/lib/careers/open"

const job = (over: Partial<Parameters<typeof isOpenJob>[0]> = {}) => ({
  published: {},
  closedAt: null,
  closingDate: "2026-11-28",
  ...over,
})

describe("isOpenJob", () => {
  const before = new Date("2026-11-20T12:00:00Z")

  it("a published job with a future closing date is open", () => {
    expect(isOpenJob(job(), before)).toBe(true)
  })

  it("closed by hand is not open", () => {
    expect(
      isOpenJob(job({ closedAt: new Date("2026-11-19T00:00:00Z") }), before)
    ).toBe(false)
  })

  it("a draft is never open", () => {
    expect(isOpenJob(job({ published: null }), before)).toBe(false)
  })

  it("no closing date stays open until closed by hand", () => {
    expect(
      isOpenJob(job({ closingDate: null }), new Date("2030-01-01T00:00:00Z"))
    ).toBe(true)
  })

  it("a closing date yesterday is not open", () => {
    expect(isOpenJob(job(), new Date("2026-11-29T12:00:00Z"))).toBe(false)
  })

  it("closing date counts in Irish time", () => {
    // Winter: Irish time is UTC. 23:30 on the closing day → still open.
    expect(isOpenJob(job(), new Date("2026-11-28T23:30:00Z"))).toBe(true)
    expect(isOpenJob(job(), new Date("2026-11-29T00:30:00Z"))).toBe(false)
    // Summer: Irish time is UTC+1. 23:30 UTC is already the next day in Ireland.
    expect(
      isOpenJob(
        job({ closingDate: "2026-07-10" }),
        new Date("2026-07-10T23:30:00Z")
      )
    ).toBe(false)
    expect(irishToday(new Date("2026-07-10T23:30:00Z"))).toBe("2026-07-11")
  })
})
