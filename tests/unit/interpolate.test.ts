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
import { groupCompaniesFixture } from "@/server/db/seed/fixtures/group-companies"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

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

  it("derives the group companies' hrefs from their phone (static site's phoneHref)", () => {
    // components/home/site-footer.tsx groupCompanies[].phone before Phase 3.
    const original = ["tel:+353858591299", "tel:+353872948880"]
    const companies = groupCompaniesFixture(fixtureMediaLookup)
    expect(companies).toHaveLength(original.length)
    companies.forEach((company, i) =>
      expect(telHref(company.phone)).toBe(original[i])
    )
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

describe("share networks match the static site's ShareLinks", () => {
  // Verbatim from components/blog/share-links.tsx at 3689369 (no text param).
  const original: Record<string, (url: string) => string> = {
    Facebook: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    LinkedIn: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    X: (url) => `https://x.com/intent/post?url=${encodeURIComponent(url)}`,
  }
  const pages = [
    {
      url: "http://localhost:3000/blog/5-signs-your-office-needs-a-professional-clean",
      title: "5 Signs Your Office Needs a Professional Clean",
    },
    {
      url: "https://example.ie/blog/a?x=1&y=2#top",
      title: "Q&A: \u201cHSE\u201d \u2014 100% safe? #1 / {url}",
    },
  ]

  it.each(pages)("matches the static site's share URLs for $url", (page) => {
    const { networks } =
      pagesFixture(fixtureMediaLookup).blog.data.article.share
    expect(networks.map((n) => n.name)).toEqual(Object.keys(original))
    for (const network of networks)
      expect(shareHref(network.url, page)).toBe(
        original[network.name](page.url)
      )
  })
})

describe("seeded href templates all resolve", () => {
  const settings = settingsFixture(fixtureMediaLookup)
  const values = contactPlaceholders(settings.contact)

  /** Every string under an href-like key ("href", "url", "link", "…Href") with a {placeholder}. */
  function templatedHrefs(value: unknown, path = "", out: string[][] = []) {
    if (Array.isArray(value))
      value.forEach((v, i) => templatedHrefs(v, `${path}[${i}]`, out))
    else if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value)) {
        const at = path ? `${path}.${key}` : key
        if (
          typeof child === "string" &&
          /^(href|url|link)$|Href$/.test(key) &&
          child.includes("{")
        )
          out.push([at, child])
        else templatedHrefs(child, at, out)
      }
    return out
  }

  const hrefs = templatedHrefs({
    settings,
    pages: pagesFixture(fixtureMediaLookup),
  })

  it("finds the templated hrefs (CP's contact links are derived, so only the share networks carry placeholders)", () => {
    expect(hrefs.map(([, href]) => href)).toEqual([
      "https://www.facebook.com/sharer/sharer.php?u={url}",
      "https://www.linkedin.com/sharing/share-offsite/?url={url}",
      "https://x.com/intent/post?url={url}",
    ])
  })

  it.each(hrefs)("%s (%s) resolves to a safe href", (path, template) => {
    const resolved = path.includes("share.networks")
      ? shareHref(template, { url: "https://example.ie/blog/x", title: "T" })
      : interpolateHref(template, values)
    expect(resolved).not.toBe("#")
    expect(resolved).not.toMatch(/\{\w+\}/)
  })

  it("resolves CP's contact numbers from the seeded contact settings", () => {
    expect(interpolate("Tel: {office} Ext {officeExtension}", values)).toBe(
      "Tel: 057 8697670 Ext 4"
    )
    expect(interpolate("{mobile}", values)).toBe("085 806 2369")
    expect(interpolate("{officeHref}", values)).toBe("tel:+353578697670")
    expect(interpolate("{mobileHref}", values)).toBe("tel:+353858062369")
  })
})
