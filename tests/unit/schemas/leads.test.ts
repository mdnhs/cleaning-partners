import { describe, expect, it } from "vitest"

import { LEAD_STATUSES, leadSubmission } from "@/lib/schemas/api/leads"
import { LEAD_STATUSES as DB_LEAD_STATUSES } from "@/server/db/schema"

const valid = {
  name: "  Aoife Byrne ",
  email: " aoife@example.com ",
  phone: " 085 000 0000 ",
  consent: true as const,
}

const issues = (input: object) =>
  leadSubmission
    .safeParse({ ...valid, ...input })
    .error?.issues.map((i) => i.path.join(".")) ?? []

describe("leadSubmission (shared Zod schema, spec §9, R7-3)", () => {
  it("trims, keeps inner text, blank optionals become null and a missing message becomes empty", () => {
    expect(
      leadSubmission.parse({
        ...valid,
        address: "   ",
        service: "",
        sourcePage: "/contact",
      })
    ).toEqual({
      name: "Aoife Byrne",
      email: "aoife@example.com",
      phone: "085 000 0000",
      company: null,
      address: null,
      service: null,
      message: "",
      consent: true,
      sourcePage: "/contact",
    })
  })

  it("keeps a multi-line message and a trimmed address", () => {
    expect(
      leadSubmission.parse({
        ...valid,
        address: "  12 Main Street, R32 AB12 ",
        message: "Line one\nLine two\ttabbed",
      })
    ).toMatchObject({
      address: "12 Main Street, R32 AB12",
      message: "Line one\nLine two\ttabbed",
    })
  })

  it("phone is required", () => {
    const withoutPhone = { ...valid, phone: undefined }
    const missing = leadSubmission.safeParse(withoutPhone)
    expect(missing.success).toBe(false)
    expect(issues({ phone: "   " })).toEqual(["phone"])
    const blank = leadSubmission.safeParse({ ...valid, phone: "  " })
    expect(blank.error?.issues[0].message).toBe("Enter your phone number")
  })

  it("consent must be true", () => {
    const withoutConsent = { ...valid, consent: undefined }
    expect(leadSubmission.safeParse(withoutConsent).success).toBe(false)
    expect(issues({ consent: false })).toEqual(["consent"])
    expect(issues({ consent: "true" })).toEqual(["consent"])
    expect(
      leadSubmission.safeParse({ ...valid, consent: false }).error?.issues[0]
        .message
    ).toBe("Please agree to be contacted")
  })

  it("rejects bad email, control characters and long text; message is optional", () => {
    expect(issues({ email: "nope" })).toEqual(["email"])
    expect(issues({ name: "A\nB" })).toEqual(["name"])
    expect(issues({ message: "nul\u0000byte" })).toEqual(["message"])
    expect(issues({ message: "x".repeat(5001) })).toEqual(["message"])
    expect(issues({ address: "x".repeat(301) })).toEqual(["address"])
    expect(issues({ message: "   " })).toEqual([])
    expect(issues({ sourcePage: "https://evil.example" })).toEqual([
      "sourcePage",
    ])
    expect(issues({ sourcePage: "//evil.example" })).toEqual(["sourcePage"])
  })

  it("sourcePage: same-site path only, no NUL, backslash or protocol-relative form", () => {
    const bad = (sourcePage: string) => issues({ sourcePage })
    expect(bad("/contact\u0000x")).toEqual(["sourcePage"])
    expect(bad("/\\evil.example")).toEqual(["sourcePage"])
    expect(bad("//x")).toEqual(["sourcePage"])
    expect(bad("/a\\b")).toEqual(["sourcePage"])
    expect(bad("/services/office-cleaning?ref=x#top")).toEqual([])
  })

  it("single-line fields reject line/paragraph separators and bidi controls", () => {
    for (const ch of [
      "\u2028",
      "\u2029",
      "\u202A",
      "\u202B",
      "\u202C",
      "\u202D",
      "\u202E",
      "\u2066",
      "\u2067",
      "\u2068",
      "\u2069",
    ]) {
      expect(issues({ name: `Aoife${ch}Rí` })).toEqual(["name"])
      expect(issues({ company: `Acme${ch}Ltd` })).toEqual(["company"])
      expect(issues({ phone: `085${ch}000` })).toEqual(["phone"])
      expect(issues({ address: `12${ch}Main` })).toEqual(["address"])
      expect(issues({ service: `x${ch}y` })).toEqual(["service"])
      expect(new Set(issues({ sourcePage: `/a${ch}b` }))).toEqual(
        new Set(["sourcePage"])
      )
    }
  })

  it("accepts the honeypot (any type) and Turnstile token fields", () => {
    expect(
      leadSubmission.parse({ ...valid, website: "x", turnstileToken: "t" })
    ).toMatchObject({ website: "x", turnstileToken: "t" })
    for (const website of [1, true, ["x"], { a: 1 }, null])
      expect(leadSubmission.safeParse({ ...valid, website }).success).toBe(true)
  })

  it("lists the same statuses as the database enum", () => {
    expect([...LEAD_STATUSES]).toEqual([...DB_LEAD_STATUSES])
  })
})
