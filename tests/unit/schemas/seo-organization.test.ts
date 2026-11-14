import { describe, expect, it } from "vitest"

import { organizationSettings } from "@/lib/schemas/settings/seo-defaults"

const currency = organizationSettings.shape.currency

describe("organization currency", () => {
  it.each(["EUR", "GBP", "USD"])("accepts the ISO 4217 code %s", (code) => {
    expect(currency.safeParse(code).success).toBe(true)
  })

  it.each(["XYZ", "eur", "EU", "EURO", ""])("rejects %j", (code) => {
    expect(currency.safeParse(code).success).toBe(false)
  })

  it("says what is wrong with a made-up code", () => {
    const result = currency.safeParse("XYZ")
    expect(result.error?.issues[0]?.message).toBe(
      "Not a known currency code, e.g. EUR"
    )
  })
})
