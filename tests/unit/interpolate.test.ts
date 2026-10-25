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

// Local contact fixture: the seed fixtures arrive in a later phase.
const contact: ContactSettings = {
  phone24h: "(085) 8018746",
  office: "057 8697670",
  operationsMobile: "085 859 1299",
  operationsExtension: "2",
  email: "info@cleaningpartners.ie",
  operationsEmail: "operations@cleaningpartners.ie",
  hours: "Mon-Fri 9-5",
  addressLine1: "1 Main Street",
  addressLine2: "Dublin",
  mapsHref: "https://maps.example.ie/?q=1+Main+Street",
}

describe("telHref", () => {
  // Every hard-coded tel: href of the static site, from its display number.
  it.each([
    ["(085) 8018746", "tel:+353858018746"],
    ["057 8697670", "tel:+353578697670"],
    ["085 859 1299", "tel:+353858591299"],
    ["(087) 924 8880", "tel:+353879248880"],
    ["085 806 2369", "tel:+353858062369"],
    ["+353 85 801 8746", "tel:+353858018746"],
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
    expect(interpolate("Call 24/7: {phone24h}", values)).toBe(
      "Call 24/7: (085) 8018746"
    )
    expect(interpolate("{phone24hHref}", values)).toBe("tel:+353858018746")
    expect(interpolate("{officeHref}", values)).toBe("tel:+353578697670")
    expect(interpolate("{operationsMobileHref}", values)).toBe(
      "tel:+353858591299"
    )
    expect(interpolate("Tel: {office} Ext 2", values)).toBe(
      "Tel: 057 8697670 Ext 2"
    )
    expect(interpolate("mailto:{operationsEmail}", values)).toBe(
      "mailto:operations@cleaningpartners.ie"
    )
    expect(interpolate("{mapsHref}", values)).toBe(contact.mapsHref)
  })
})

describe("contactPlaceholders", () => {
  it("derives the tel: hrefs from the numbers (not stored); mapsHref is stored", () => {
    const values = contactPlaceholders({
      ...contact,
      phone24h: "01 234 5678",
      office: "(045) 111 2222",
      operationsMobile: "+44 7700 900123",
    })
    expect(values.phone24hHref).toBe("tel:+35312345678")
    expect(values.officeHref).toBe("tel:+353451112222")
    expect(values.operationsMobileHref).toBe("tel:+447700900123")
    expect(values.mapsHref).toBe(contact.mapsHref)
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
    expect(interpolateHref("{mapsHref}", values)).toBe(contact.mapsHref)
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

describe("shareHref (ruling: {url}/{title} URI-encoded)", () => {
  it("URI-encodes {url} and {title}", () => {
    expect(
      shareHref("https://x.com/intent/post?url={url}&text={title}", {
        url: "https://example.ie/blog/a?x=1&y=2#top",
        title: "Q&A: 100% safe? #1 / {url}",
      })
    ).toBe(
      "https://x.com/intent/post?url=" +
        encodeURIComponent("https://example.ie/blog/a?x=1&y=2#top") +
        "&text=" +
        encodeURIComponent("Q&A: 100% safe? #1 / {url}")
    )
  })
})

describe("templated hrefs resolve", () => {
  const values = contactPlaceholders(contact)

  it.each([
    "{phone24hHref}",
    "{officeHref}",
    "{operationsMobileHref}",
    "mailto:{operationsEmail}",
    "{mapsHref}",
  ])("%s resolves to a safe href", (template) => {
    const resolved = interpolateHref(template, values)
    expect(resolved).not.toBe("#")
    expect(resolved).not.toMatch(/\{\w+\}/)
  })
})
