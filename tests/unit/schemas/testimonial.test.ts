import { describe, expect, it } from "vitest"

import { testimonialSchema } from "@/lib/schemas/content/testimonial"

const valid = {
  name: "Thomas Murray",
  initials: "TM",
  quote:
    "Great service – easy to arrange, friendly people. I am very happy! Will definitely be using their service again.",
  rating: 4,
}

describe("testimonialSchema (R3-3)", () => {
  it("parses and round-trips a testimonial unchanged", () => {
    expect(testimonialSchema.parse(valid)).toEqual(valid)
  })

  it("defaults the rating to 5", () => {
    const rest = {
      name: valid.name,
      initials: valid.initials,
      quote: valid.quote,
    }
    expect(testimonialSchema.parse(rest).rating).toBe(5)
  })

  it.each([0, 6, 2.5, -1, "5"])("rejects the rating %j", (rating) => {
    expect(testimonialSchema.safeParse({ ...valid, rating }).success).toBe(
      false
    )
  })

  it.each([1, 2, 3, 4, 5])("accepts the rating %i", (rating) => {
    expect(testimonialSchema.safeParse({ ...valid, rating }).success).toBe(true)
  })

  it.each(["name", "initials", "quote"] as const)("needs %s", (field) => {
    expect(testimonialSchema.safeParse({ ...valid, [field]: "" }).success).toBe(
      false
    )
  })

  it("keeps the en dash and apostrophes in a quote verbatim", () => {
    const quote = "Great service – it's spotless & we're delighted"
    expect(testimonialSchema.parse({ ...valid, quote }).quote).toBe(quote)
  })
})
