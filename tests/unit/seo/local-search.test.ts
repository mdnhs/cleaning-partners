import { describe, expect, it } from "vitest"

import { seoDefaultsSettings } from "@/lib/schemas/settings/seo-defaults"
import { llmsText } from "@/lib/seo/llms"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { siteLlms } from "@/templates/shared/llms"
import { twitterSite } from "@/templates/shared/page-meta"
import { siteJsonLd } from "@/templates/shared/structured-data"

const seeded = () =>
  structuredClone(fixtureSiteSources().settings["seo.defaults"])

const withOrg = (org: Record<string, unknown>) => {
  const value = seeded()
  return { ...value, organization: { ...value.organization, ...org } }
}

describe("SEO defaults: local search, X handle, llms.txt", () => {
  it("rows saved before these fields still parse, with empty defaults", () => {
    const value = seeded() as Record<string, unknown>
    delete value.twitterHandle
    delete value.llms
    const org = { ...(value.organization as Record<string, unknown>) }
    for (const key of [
      "priceRange",
      "otherAreas",
      "latitude",
      "longitude",
      "ratingValue",
      "reviewCount",
    ])
      delete org[key]
    const parsed = seoDefaultsSettings.parse({ ...value, organization: org })
    expect(parsed.twitterHandle).toBe("")
    expect(parsed.llms).toEqual({ enabled: true, summary: "" })
    expect(parsed.organization).toMatchObject({
      priceRange: "",
      otherAreas: [],
      latitude: "",
      ratingValue: "",
    })
  })

  it("rating and review count go together; so do latitude and longitude", () => {
    const issues = (org: Record<string, unknown>) =>
      seoDefaultsSettings
        .safeParse(withOrg(org))
        .error?.issues.map((i) => i.path.join("."))
    expect(issues({ ratingValue: "4.9" })).toEqual(["organization.reviewCount"])
    expect(issues({ reviewCount: "120" })).toEqual(["organization.ratingValue"])
    expect(issues({ latitude: "53.1" })).toEqual(["organization.longitude"])
    expect(
      issues({
        ratingValue: "4.9",
        reviewCount: "120",
        latitude: "53.1150",
        longitude: "-7.3196",
      })
    ).toBeUndefined()
  })

  it("rejects out-of-range numbers and bad handles", () => {
    const bad = [
      withOrg({ ratingValue: "6", reviewCount: "1" }),
      withOrg({ ratingValue: "4.5", reviewCount: "1.5" }),
      withOrg({ latitude: "91", longitude: "0" }),
      withOrg({ latitude: "abc", longitude: "0" }),
      { ...seeded(), twitterHandle: "@has space" },
      { ...seeded(), twitterHandle: "@waytoolonghandle123" },
    ]
    for (const value of bad)
      expect(seoDefaultsSettings.safeParse(value).success).toBe(false)
    expect(
      seoDefaultsSettings.safeParse({ ...seeded(), twitterHandle: "cp_ie" })
        .success
    ).toBe(true)
  })

  it("twitter:site gets one leading @, and nothing while blank", () => {
    expect(twitterSite("cp_ie")).toBe("@cp_ie")
    expect(twitterSite("@cp_ie")).toBe("@cp_ie")
    expect(twitterSite("  ")).toBeNull()
  })

  it("the business JSON-LD carries the filled local-search details", () => {
    const s = fixtureSiteSources()
    s.settings["seo.defaults"] = withOrg({
      otherAreas: ["Co. Offaly"],
      priceRange: "€€",
      latitude: "53.1150",
      longitude: "-7.3196",
      ratingValue: "4.9",
      reviewCount: "120",
    }) as (typeof s.settings)["seo.defaults"]
    expect(siteJsonLd(s, "https://x.ie")).toMatchObject({
      areaServed: ["Ireland", "Co. Offaly"],
      priceRange: "€€",
      geo: { latitude: 53.115, longitude: -7.3196 },
      aggregateRating: { ratingValue: 4.9, reviewCount: 120 },
    })
    const plain = siteJsonLd(fixtureSiteSources(), "https://x.ie")
    expect(plain).toMatchObject({ areaServed: "Ireland" })
    expect(plain).not.toHaveProperty("aggregateRating")
    expect(plain).not.toHaveProperty("geo")
  })
})

describe("llms.txt", () => {
  it("H1, summary quote, details, then linked sections; empty ones dropped", () => {
    expect(
      llmsText({
        siteName: "Cleaning\nPartners",
        summary: "We  clean.",
        details: ["Phone: 1", " "],
        pages: [{ title: "About [us]", url: "https://x.ie/about" }],
        services: [
          {
            title: "Medical",
            url: "https://x.ie/services/medical",
            description: "Clinics\nand GPs",
          },
        ],
        articles: [],
        legal: [{ title: "Privacy", url: "https://x.ie/privacy" }],
      })
    ).toBe(
      [
        "# Cleaning Partners",
        "",
        "> We clean.",
        "",
        "- Phone: 1",
        "",
        "## Pages",
        "",
        "- [About us](https://x.ie/about)",
        "",
        "## Services",
        "",
        "- [Medical](https://x.ie/services/medical): Clinics and GPs",
        "",
        "## Optional",
        "",
        "- [Privacy](https://x.ie/privacy)",
        "",
      ].join("\n")
    )
  })

  it("the site's llms.txt uses the summary, else the default description, and skips noindex pages", () => {
    const s = fixtureSiteSources()
    const defaults = s.settings["seo.defaults"]
    const text = siteLlms(s, "https://x.ie", [
      { label: "Privacy Policy", href: "/privacy" },
    ])
    expect(text).toContain(`> ${defaults.description}`)
    expect(text).toContain(`# ${s.settings.site.name}`)
    expect(text).toContain(`- Email: ${s.settings.contact.email}`)
    expect(text).toContain("](https://x.ie/about)")
    expect(text).toContain("- [Privacy Policy](https://x.ie/privacy)")
    expect(text).not.toContain("](https://x.ie/)")

    s.settings["seo.defaults"] = {
      ...defaults,
      llms: { enabled: true, summary: "Our own words." },
    }
    s.pages.about.seo = { ...s.pages.about.seo, noindex: true }
    const own = siteLlms(s, "https://x.ie", [])
    expect(own).toContain("> Our own words.")
    expect(own).not.toContain("https://x.ie/about")
  })
})
