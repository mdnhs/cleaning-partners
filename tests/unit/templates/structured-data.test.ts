import { describe, expect, it } from "vitest"

import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import type { SiteSources } from "@/templates/shared/sources"
import {
  articleJsonLdFor,
  serviceJsonLd,
  siteJsonLd,
} from "@/templates/shared/structured-data"

type Node = {
  "@type": string
  legalName: string
  makesOffer: unknown[]
  itemListElement: { name: string }[]
}
// The serialised node, as a crawler reads it.
const plain = (x: unknown) => JSON.parse(JSON.stringify(x)) as Node

const origin = "https://cleaningpartners.ie"
const SLUG = "5-signs-your-office-needs-a-professional-clean"

describe("structured data over the site sources (R8-4)", () => {
  const s = fixtureSiteSources()

  it("the business node comes from settings and lists the services", () => {
    const json = plain(siteJsonLd(s, origin))
    expect(json["@type"]).toBe("LocalBusiness")
    expect(json).toMatchObject({
      "@id": "https://cleaningpartners.ie/#organization",
      name: s.settings.site.name,
      legalName: s.settings.site.legalName,
      telephone: "057 8697670",
      email: "info@cleaningpartners.ie",
      logo: "https://cleaningpartners.ie/images/home/logo.png",
    })
    expect(json.legalName).toMatch(/^Cleaning Partners Ltd/)
    expect(json.makesOffer).toHaveLength(s.services.length)
    expect(JSON.stringify(json.makesOffer[0])).toContain(
      "https://cleaningpartners.ie/services/medical-cleaning"
    )
  })

  it("follows edits to settings.site.legalName and settings.contact.email", () => {
    const edited: SiteSources = {
      ...s,
      settings: {
        ...s.settings,
        site: { ...s.settings.site, legalName: "Edited Legal Name Ltd" },
        contact: { ...s.settings.contact, email: "edited@example.test" },
      },
    }
    const json = plain(siteJsonLd(edited, origin))
    expect(json).toMatchObject({
      legalName: "Edited Legal Name Ltd",
      email: "edited@example.test",
    })
  })

  it("follows the organisation type in seo.defaults", () => {
    const edited: SiteSources = {
      ...s,
      settings: {
        ...s.settings,
        "seo.defaults": {
          ...s.settings["seo.defaults"],
          organization: {
            ...s.settings["seo.defaults"].organization,
            type: "ProfessionalService",
          },
        },
      },
    }
    expect(plain(siteJsonLd(edited, origin))["@type"]).toBe(
      "ProfessionalService"
    )
  })

  it("a service has Home > Services > service breadcrumbs", () => {
    const crumbs = plain(serviceJsonLd(s, "medical-cleaning", origin)![0])
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual([
      "Home",
      "Services",
      "Medical Cleaning",
    ])
    expect(serviceJsonLd(s, "nope", origin)).toBeNull()
  })

  it("an article has Article and Home > Blog > article", () => {
    const [article, crumbs] = articleJsonLdFor(s, SLUG, origin)!
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "5 Signs Your Office Needs a Professional Clean",
      datePublished: "2026-09-15T09:00:00.000Z",
      articleSection: "Commercial",
      author: { name: "The Clean Team" },
      image: "https://cleaningpartners.ie/images/home/vacuuming.png",
      publisher: { "@id": "https://cleaningpartners.ie/#organization" },
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

  it("no node carries another company's name", () => {
    const all = JSON.stringify([
      siteJsonLd(s, origin),
      serviceJsonLd(s, "medical-cleaning", origin),
      articleJsonLdFor(s, SLUG, origin),
    ])
    expect(all).not.toMatch(/security|securitypartnersltd/i)
  })
})
