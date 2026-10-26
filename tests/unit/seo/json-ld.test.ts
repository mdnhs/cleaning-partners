import { describe, expect, it } from "vitest"

import {
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdText,
  organizationJsonLd,
  type OrganizationInput,
} from "@/lib/seo/json-ld"

const org: OrganizationInput = {
  type: "LocalBusiness",
  url: "https://x.ie",
  name: "Cleaning Partners Ltd.",
  legalName: "Cleaning Partners Ltd",
  logo: "https://x.ie/images/logo.png",
  telephone: "057 8697670",
  email: "info@x.ie",
  address: {
    streetAddress: "Derryguile",
    addressLocality: "Mountmellick",
    addressRegion: "Co. Laois",
    postalCode: "R32 YX49",
    addressCountry: "IE",
  },
  areaServed: "Ireland",
  sameAs: [],
  services: [{ name: "Medical Cleaning", url: "https://x.ie/services/a" }],
}

describe("JSON-LD builders", () => {
  it("organisation: LocalBusiness with a postal address and offered services", () => {
    const data = organizationJsonLd(org)
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://x.ie/#organization",
      url: "https://x.ie/",
      telephone: "057 8697670",
      address: { "@type": "PostalAddress", postalCode: "R32 YX49" },
      makesOffer: [
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Medical Cleaning" },
        },
      ],
    })
    expect(data).not.toHaveProperty("sameAs")
    expect(
      organizationJsonLd({
        ...org,
        type: "ProfessionalService",
        sameAs: ["https://linkedin.com/company/x"],
      })
    ).toMatchObject({
      "@type": "ProfessionalService",
      sameAs: ["https://linkedin.com/company/x"],
    })
  })

  it("article: headline, author and publisher; date only when known", () => {
    const base = {
      url: "https://x.ie/blog/a",
      headline: "A",
      description: "D",
      image: "https://x.ie/i.png",
      section: "News",
      authorName: "The Clean Team",
      origin: "https://x.ie",
    }
    const data = articleJsonLd({
      ...base,
      datePublished: "2026-09-20T09:00:00.000Z",
    })
    expect(data).toMatchObject({
      "@type": "Article",
      url: "https://x.ie/blog/a",
      datePublished: "2026-09-20T09:00:00.000Z",
      author: { "@type": "Organization", name: "The Clean Team" },
    })
    expect(data.publisher).toEqual({ "@id": "https://x.ie/#organization" })
    expect(articleJsonLd({ ...base, datePublished: null })).not.toHaveProperty(
      "datePublished"
    )
  })

  it("breadcrumbs are numbered from 1", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Home", url: "https://x.ie/" },
        { name: "Blog", url: "https://x.ie/blog" },
      ]).itemListElement
    ).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://x.ie/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://x.ie/blog",
      },
    ])
  })

  it("jsonLdText cannot close the <script> and round-trips", () => {
    const data = { name: "</script><script>alert(1)</script> &  " }
    const text = jsonLdText(data)
    expect(text).not.toContain("<")
    expect(text).not.toContain(">")
    expect(JSON.parse(text)).toEqual(data)
  })

  it("jsonLdText escapes U+2028 and U+2029", () => {
    const data = { name: "a\u2028b\u2029c" }
    const text = jsonLdText(data)
    expect(text).not.toContain("\u2028")
    expect(text).not.toContain("\u2029")
    expect(text).toContain("\\u2028")
    expect(text).toContain("\\u2029")
    expect(JSON.parse(text)).toEqual(data)
  })
})
