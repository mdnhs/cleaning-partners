import { describe, expect, it } from "vitest"

import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { consentBannerCopy } from "@/templates/shared/consent"
import { PAGE_HERO_GROUPS } from "@/templates/shared/editor-groups"
import { pageMetadata, siteMetadata } from "@/templates/shared/page-meta"
import type { SiteSources } from "@/templates/shared/sources"
import {
  articleJsonLdFor,
  breadcrumbJsonLd,
  organizationJsonLd,
  serviceJsonLd,
  siteJsonLd,
} from "@/templates/shared/structured-data"

const org = {
  type: "LocalBusiness" as const,
  url: "https://cleaningpartners.ie",
  name: "Cleaning Partners Ltd.",
  legalName: "Cleaning Partners Ltd.",
  logo: "https://cleaningpartners.ie/images/home/logo.png",
  telephone: "057 8697670",
  email: "info@cleaningpartners.ie",
  address: {
    streetAddress: "Derryguile",
    addressLocality: "Mountmellick",
    addressRegion: "Co. Laois",
    postalCode: "R32 YX49",
    addressCountry: "IE",
  },
  areaServed: "Ireland",
  sameAs: [] as string[],
  services: [
    { name: "Medical Cleaning", url: "https://cleaningpartners.ie/services/x" },
  ],
}

describe("structured data", () => {
  it("builds a plain LocalBusiness from settings values, no SecurityService", () => {
    const json = organizationJsonLd(org)
    expect(json["@type"]).toBe("LocalBusiness")
    expect(json["@id"]).toBe("https://cleaningpartners.ie/#organization")
    expect(json.name).toBe("Cleaning Partners Ltd.")
    expect(json).not.toHaveProperty("sameAs")
    expect(JSON.stringify(json)).not.toMatch(/Security|SecurityService/)
  })

  it("keeps sameAs only when set", () => {
    expect(
      organizationJsonLd({ ...org, sameAs: ["https://x.com/cp"] }).sameAs
    ).toEqual(["https://x.com/cp"])
  })

  it("builds a breadcrumb list", () => {
    const json = breadcrumbJsonLd([
      { name: "Home", url: "https://cleaningpartners.ie/" },
      { name: "Blog", url: "https://cleaningpartners.ie/blog" },
    ])
    expect(json["@type"]).toBe("BreadcrumbList")
    expect(json.itemListElement.map((i) => i.position)).toEqual([1, 2])
  })
})

describe("page metadata", () => {
  const s = fixtureSiteSources()
  const withSeo = (
    key: "about" | "privacy",
    seo: SiteSources["pages"]["about"]["seo"]
  ): SiteSources => ({
    ...s,
    pages: { ...s.pages, [key]: { ...s.pages[key], seo } },
  })

  it("home uses the site title; inner pages use the template", () => {
    expect(pageMetadata(s, "home").title).toBe(
      "Cleaning Partners Ltd. | The Clean Team"
    )
    const about = pageMetadata(withSeo("about", {}), "about")
    expect(about.title).toBe("About Us | Cleaning Partners Ltd.")
    expect(about.description).toBe(
      "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond."
    )
    expect(about.alternates?.canonical).toBe("/about")
    expect(about.openGraph).toMatchObject({
      type: "website",
      url: "/about",
      siteName: "Cleaning Partners Ltd.",
    })
  })

  it("an own title and noindex win", () => {
    const m = pageMetadata(
      withSeo("privacy", { title: "Own", noindex: true }),
      "privacy"
    )
    expect(m.title).toBe("Own")
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it("falls back to the generated share card until an image is set", () => {
    expect(pageMetadata(s, "about").openGraph?.images).toEqual([
      { url: "/og/page/about", width: 1200, height: 630 },
    ])
  })

  it("site metadata sets the base, the default title and description", () => {
    const m = siteMetadata(s, "https://cleaningpartners.ie")
    expect(String(m.metadataBase)).toBe("https://cleaningpartners.ie/")
    expect(m.title).toBe("Cleaning Partners Ltd. | The Clean Team")
    expect(m.description).toBe(
      "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond."
    )
    expect(m.icons).toEqual({ icon: "/favicon.ico" })
    expect(m.robots).toBeUndefined()
    expect(m.verification).toBeUndefined()
  })

  it("site-wide noindex and verification tokens reach the root metadata", () => {
    const defaults = s.settings["seo.defaults"]
    const m = siteMetadata(
      {
        ...s,
        settings: {
          ...s.settings,
          "seo.defaults": {
            ...defaults,
            robots: "noindex",
            verification: { google: "g-token", bing: "b-token" },
          },
        },
      },
      "https://cleaningpartners.ie"
    )
    expect(m.robots).toEqual({ index: false, follow: false })
    expect(m.verification).toEqual({
      google: "g-token",
      other: { "msvalidate.01": "b-token" },
    })
  })
})

describe("structured data over the site sources", () => {
  const s = fixtureSiteSources()
  const origin = "https://cleaningpartners.ie"

  it("the business node lists the services and carries no other company", () => {
    const json = siteJsonLd(s, origin)
    expect(json["@type"]).toBe("LocalBusiness")
    expect(json.name).toBe("Cleaning Partners Ltd.")
    expect(json.telephone).toBe("057 8697670")
    expect(json.logo).toBe("https://cleaningpartners.ie/images/home/logo.png")
    expect(json.makesOffer).toHaveLength(s.services.length)
    expect(json.makesOffer[0].itemOffered.url).toBe(
      "https://cleaningpartners.ie/services/medical-cleaning"
    )
    expect(JSON.stringify(json)).not.toMatch(/Security|SecurityService/)
  })

  it("a service has Home > Services > service breadcrumbs", () => {
    const [crumbs] = serviceJsonLd(s, "medical-cleaning", origin)!
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual([
      "Home",
      "Services",
      "Medical Cleaning",
    ])
    expect(serviceJsonLd(s, "nope", origin)).toBeNull()
  })

  it("an article has Article and Home > Blog > article", () => {
    const [article, crumbs] = articleJsonLdFor(
      s,
      "5-signs-your-office-needs-a-professional-clean",
      origin
    )!
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "5 Signs Your Office Needs a Professional Clean",
      datePublished: "2026-09-15T09:00:00.000Z",
      articleSection: "Commercial",
      author: { name: "The Clean Team" },
      image: "https://cleaningpartners.ie/images/home/vacuuming.png",
    })
    expect(
      (crumbs as { itemListElement: { name: string }[] }).itemListElement.map(
        (i) => i.name
      )
    ).toEqual([
      "Home",
      "Blog",
      "5 Signs Your Office Needs a Professional Clean",
    ])
    expect(articleJsonLdFor(s, "nope", origin)).toBeNull()
  })
})

describe("consent copy", () => {
  it("fills placeholders and routes the policy link through linkView", () => {
    const s = fixtureSiteSources()
    const copy = consentBannerCopy(s, {
      title: "Cookies at {phone24h}",
      body: "Body",
      acceptLabel: "Accept",
      rejectLabel: "Reject",
      customiseLabel: "Customise",
      saveLabel: "Save",
      manageLabel: "Cookie settings",
      closeLabel: "Close",
      policyLink: { label: "Policy", href: "javascript:alert(1)" },
      categories: {
        necessary: { label: "N", description: "d" },
        analytics: { label: "A", description: "d" },
        marketing: { label: "M", description: "d" },
      },
      version: 2,
      reconsentMonths: 3,
    })
    expect(copy.title).toBe("Cookies at (085) 8062369")
    // linkView re-checks the href: an unsafe one renders "#".
    expect(copy.policyLink).toEqual({ label: "Policy", href: "#" })
    expect(copy.version).toBe(2)
  })
})

describe("editor groups", () => {
  it("splits the page hero into text and banner", () => {
    expect(PAGE_HERO_GROUPS.map((g) => g.title)).toEqual([
      "Text",
      "Banner image",
    ])
  })
})
