import { describe, expect, it } from "vitest"

import { consentBannerCopy } from "@/templates/shared/consent"
import { PAGE_HERO_GROUPS } from "@/templates/shared/editor-groups"
import { pageMetadata, siteMetadata } from "@/templates/shared/page-meta"
import {
  breadcrumbJsonLd,
  organizationJsonLd,
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
  const defaults = {
    title: "Cleaning Partners Ltd.",
    titleTemplate: "{title} | Cleaning Partners Ltd.",
    description: "Cleaning across Ireland. Call {office}.",
  }
  const values = { office: "057 8697670" }

  it("home uses the site title; inner pages use the template", () => {
    expect(
      pageMetadata({
        key: "home",
        path: "/",
        siteName: "Cleaning Partners Ltd.",
        defaults,
        values,
        seo: {},
        heroTitle: null,
      }).title
    ).toBe("Cleaning Partners Ltd.")
    const about = pageMetadata({
      key: "about",
      path: "/about",
      siteName: "Cleaning Partners Ltd.",
      defaults,
      values,
      seo: {},
      heroTitle: "About Us",
    })
    expect(about.title).toBe("About Us | Cleaning Partners Ltd.")
    expect(about.description).toBe("Cleaning across Ireland. Call 057 8697670.")
    expect(about.alternates?.canonical).toBe("/about")
  })

  it("an own title and noindex win", () => {
    const m = pageMetadata({
      key: "privacy",
      path: "/privacy",
      siteName: "Cleaning Partners Ltd.",
      defaults,
      values,
      seo: { title: "Own", noindex: true },
      heroTitle: "Privacy Policy",
    })
    expect(m.title).toBe("Own")
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it("site metadata sets the base and the default description", () => {
    const m = siteMetadata({
      origin: "https://cleaningpartners.ie",
      defaults,
      values,
      favicon: null,
      robots: "index",
    })
    expect(String(m.metadataBase)).toBe("https://cleaningpartners.ie/")
    expect(m.description).toBe("Cleaning across Ireland. Call 057 8697670.")
    expect(m.icons).toEqual({ icon: "/favicon.ico" })
  })
})

describe("consent copy", () => {
  it("fills placeholders and routes the policy link through the resolver", () => {
    const copy = consentBannerCopy(
      {
        title: "Cookies at {name}",
        body: "Body",
        acceptLabel: "Accept",
        rejectLabel: "Reject",
        customiseLabel: "Customise",
        saveLabel: "Save",
        manageLabel: "Cookie settings",
        closeLabel: "Close",
        policyLink: { label: "Policy", href: "/privacy" },
        categories: {
          necessary: { label: "N", description: "d" },
          analytics: { label: "A", description: "d" },
          marketing: { label: "M", description: "d" },
        },
        version: 2,
        reconsentMonths: 3,
      },
      { name: "Cleaning Partners" },
      (href) => `resolved:${href}`
    )
    expect(copy.title).toBe("Cookies at Cleaning Partners")
    expect(copy.policyLink).toEqual({
      label: "Policy",
      href: "resolved:/privacy",
    })
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
