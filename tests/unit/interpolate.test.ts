import { describe, expect, it } from "vitest"

import {
  contactPlaceholders,
  interpolate,
  interpolateHref,
  interpolateParts,
  shareHref,
  telHref,
} from "@/lib/interpolate"
import type { ContactSettings } from "@/lib/schemas/settings/contact"

// CP's numbers (docs/brief-inventory.json).
const contact: ContactSettings = {
  phone24h: "(085) 8062369",
  phone24Label: "24hr contact: {phone24h}",
  office: "057 8697670",
  officeExtension: "4",
  mobile: "085 806 2369",
  email: "info@cleaningpartners.ie",
  hours: "Mon–Fri: 9am – 6pm",
  addressLine1: "Derryguile, Mountmellick",
  addressLine2: "Co. Laois, Ireland. R32 YX49",
}

describe("telHref", () => {
  // Every hard-coded tel: href of the static site, from its display number.
  it.each([
    ["(085) 8062369", "tel:+353858062369"],
    ["057 8697670", "tel:+353578697670"],
    ["085 806 2369", "tel:+353858062369"],
    ["Tel: (085) 8591299", "tel:+353858591299"],
    ["Tel: 087 294 8880", "tel:+353872948880"],
    ["+353 85 806 2369", "tel:+353858062369"],
    ["0044 20 7946 0000", "tel:+442079460000"],
  ])("%s → %s", (phone, expected) => {
    expect(telHref(phone)).toBe(expected)
  })
})

describe("interpolate", () => {
  it("fills known placeholders and keeps unknown ones", () => {
    expect(interpolate("Call {office} or {other}", { office: "057" })).toBe(
      "Call 057 or {other}"
    )
    expect(interpolate("Page {n}", { n: 2 })).toBe("Page 2")
  })

  it("never re-expands inserted values", () => {
    expect(interpolate("{a}", { a: "{b}", b: "x" })).toBe("{b}")
  })

  it("ignores inherited keys", () => {
    expect(interpolate("{toString}", {})).toBe("{toString}")
  })

  it("reproduces the static site's contact strings", () => {
    const values = contactPlaceholders(contact)
    expect(interpolate("24hr contact: {phone24h}", values)).toBe(
      "24hr contact: (085) 8062369"
    )
    expect(interpolate("{phone24hHref}", values)).toBe("tel:+353858062369")
    expect(interpolate("{officeHref}", values)).toBe("tel:+353578697670")
    expect(interpolate("{mobileHref}", values)).toBe("tel:+353858062369")
    expect(interpolate("Tel: {office} Ext {officeExtension}", values)).toBe(
      "Tel: 057 8697670 Ext 4"
    )
    expect(interpolate("Mobile: {mobile}", values)).toBe("Mobile: 085 806 2369")
    expect(interpolate("{addressLine1},", values)).toBe(
      "Derryguile, Mountmellick,"
    )
    expect(interpolate("mailto:{email}", values)).toBe(
      "mailto:info@cleaningpartners.ie"
    )
  })
})

describe("contactPlaceholders", () => {
  it("derives the tel: hrefs from the numbers (not stored)", () => {
    const values = contactPlaceholders({
      ...contact,
      phone24h: "01 234 5678",
      office: "(045) 111 2222",
      mobile: "+44 7700 900123",
    })
    expect(values.phone24hHref).toBe("tel:+35312345678")
    expect(values.officeHref).toBe("tel:+353451112222")
    expect(values.mobileHref).toBe("tel:+447700900123")
    // A template is not a placeholder value.
    expect(Object.keys(values)).not.toContain("phone24Label")
    expect(Object.keys(contact)).not.toContain("phone24hHref")
  })
})

describe("interpolateParts (text-node parity)", () => {
  it("splits literal text and values like JSX `Call {office}`", () => {
    expect(interpolateParts("Call {office}", { office: "057" })).toEqual([
      "Call ",
      "057",
    ])
    expect(
      interpolateParts("No posts in {category} yet.", { category: "X" })
    ).toEqual(["No posts in ", "X", " yet."])
    expect(interpolateParts("Plain", {})).toEqual(["Plain"])
    expect(interpolateParts("{a}{b}", { a: "1", b: "2" })).toEqual(["1", "2"])
    expect(interpolateParts("Keep {unknown}", {})).toEqual(["Keep {unknown}"])
  })
})

describe("interpolateHref (ruling: interpolated hrefs re-checked)", () => {
  it("passes safe results through unchanged", () => {
    const values = contactPlaceholders(contact)
    expect(interpolateHref("/contact", values)).toBe("/contact")
    expect(interpolateHref("{officeHref}", values)).toBe("tel:+353578697670")
    expect(interpolateHref("mailto:{email}", values)).toBe(
      "mailto:info@cleaningpartners.ie"
    )
  })

  it.each([
    ["{a}", "javascript:alert(1)"],
    ["{a}", "data:text/html,<script>alert(1)</script>"],
    ["/{a}", "/evil.example"],
    ["/{a}", "\\evil.example"],
    ["{a}", "//evil.example"],
    ["{a}", " javascript:alert(1)"],
    ["{a}", "https://ok.example/\u0000"],
  ])("%s with %j → #", (template, value) => {
    expect(interpolateHref(template, { a: value })).toBe("#")
  })

  it("renders an unresolved whole-value placeholder as #", () => {
    expect(interpolateHref("{unknownHref}", {})).toBe("#")
  })
})

// Deferred until server/db/seed/fixtures land (Task 3.3): restore from SP tests/unit/interpolate.test.ts
// (group-companies telHref, share-network parity vs settings.microcopy, seeded href templates).
describe("shareHref (ruling: {url}/{title} URI-encoded)", () => {
  it.each([
    {
      url: "http://localhost:3000/blog/deep-cleaning-vs-regular-cleaning-what-your-business-needs",
      title: "Deep Cleaning vs Regular Cleaning: What Your Business Needs",
    },
    {
      url: "https://example.ie/blog/a?x=1&y=2#top",
      title: "Q&A: \u201cHSE\u201d \u2014 100% safe? #1 / {url}",
    },
  ])("encodes $url", (page) => {
    expect(
      shareHref("https://x.com/intent/post?url={url}&text={title}", page)
    ).toBe(
      `https://x.com/intent/post?url=${encodeURIComponent(page.url)}&text=${encodeURIComponent(page.title)}`
    )
  })
})

describe("templated hrefs resolve", () => {
  const values = contactPlaceholders(contact)

  it.each(["{phone24hHref}", "{officeHref}", "{mobileHref}", "mailto:{email}"])(
    "%s resolves to a safe href",
    (template) => {
      const resolved = interpolateHref(template, values)
      expect(resolved).not.toBe("#")
      expect(resolved).not.toMatch(/\{\w+\}/)
    }
  )
})
