import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const source = readFileSync("server/auth/auth.ts", "utf8")

describe("Better Auth client-IP config (R11-6)", () => {
  it("reads the leftmost proxy headers, as clientIp does", () => {
    expect(source).toContain(
      'ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] }'
    )
  })

  it("sets no trustedProxies and never keys on CF-Connecting-IP", () => {
    expect(source).not.toMatch(/trustedProxies/i)
    expect(source).not.toMatch(/cf-connecting-ip/i)
  })
})
