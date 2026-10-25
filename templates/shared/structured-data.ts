import { interpolate, type Placeholders } from "@/lib/interpolate"
import type { OrganizationSettings } from "@/lib/schemas/settings/seo-defaults"

// schema.org JSON-LD (spec §10) as plain objects: the business on every page
// and BreadcrumbList on detail pages. Every value comes from settings
// (site, contact, seo.defaults.organization) and the services collection;
// nothing about the business is written here. Phase 8 wires these into the
// layouts and pages.

export type OrganizationInput = {
  type: OrganizationSettings["type"]
  /** Site origin, e.g. https://cleaningpartners.ie */
  url: string
  name: string
  legalName: string
  /** Absolute logo URL. */
  logo: string
  telephone: string
  email: string
  address: {
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
  areaServed: string
  sameAs: string[]
  services: { name: string; url: string }[]
}

export const organizationId = (origin: string) => `${origin}/#organization`

export type OrganizationJsonLd = {
  "@context": "https://schema.org"
  "@type": OrganizationSettings["type"]
  "@id": string
  name: string
  legalName: string
  url: string
  logo: string
  image: string
  telephone: string
  email: string
  address: { "@type": "PostalAddress" } & OrganizationInput["address"]
  areaServed: string
  sameAs?: string[]
  makesOffer: {
    "@type": "Offer"
    itemOffered: { "@type": "Service"; name: string; url: string }
  }[]
}

/** The business: a plain LocalBusiness (or ProfessionalService) node. */
export function organizationJsonLd(i: OrganizationInput): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": i.type,
    "@id": organizationId(i.url),
    name: i.name,
    legalName: i.legalName,
    url: `${i.url}/`,
    logo: i.logo,
    image: i.logo,
    telephone: i.telephone,
    email: i.email,
    address: { "@type": "PostalAddress", ...i.address },
    areaServed: i.areaServed,
    ...(i.sameAs.length > 0 ? { sameAs: i.sameAs } : {}),
    makesOffer: i.services.map((service) => ({
      "@type": "Offer" as const,
      itemOffered: {
        "@type": "Service" as const,
        name: service.name,
        url: service.url,
      },
    })),
  }
}

export type BreadcrumbJsonLd = {
  "@context": "https://schema.org"
  "@type": "BreadcrumbList"
  itemListElement: {
    "@type": "ListItem"
    position: number
    name: string
    item: string
  }[]
}

export function breadcrumbJsonLd(
  crumbs: { name: string; url: string }[]
): BreadcrumbJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

/** Settings values the site-wide node needs; services are already published ones. */
export type SiteJsonLdSources = {
  origin: string
  site: { name: string; legalName: string; logoUrl: string }
  contact: { office: string; email: string }
  organization: OrganizationSettings
  services: { title: string; slug: string }[]
  values: Placeholders
}

export function siteJsonLd(s: SiteJsonLdSources): OrganizationJsonLd {
  const { organization: org } = s
  return organizationJsonLd({
    type: org.type,
    url: s.origin,
    name: s.site.name,
    legalName: s.site.legalName,
    logo: new URL(s.site.logoUrl, s.origin).toString(),
    telephone: s.contact.office,
    email: s.contact.email,
    address: {
      streetAddress: org.streetAddress,
      addressLocality: org.addressLocality,
      addressRegion: org.addressRegion,
      postalCode: org.postalCode,
      addressCountry: org.addressCountry,
    },
    areaServed: org.areaServed,
    sameAs: org.sameAs,
    services: s.services.map((service) => ({
      name: interpolate(service.title, s.values),
      url: new URL(`/services/${service.slug}`, s.origin).toString(),
    })),
  })
}
