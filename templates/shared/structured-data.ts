import { interpolate } from "@/lib/interpolate"
import { absoluteUrl } from "@/lib/seo/urls"
import type { OrganizationSettings } from "@/lib/schemas/settings/seo-defaults"

import type { SiteSources } from "./sources"
import { placeholders } from "./views"

// schema.org JSON-LD (spec §10) as plain objects: the business on every
// page, Article on articles and BreadcrumbList on detail pages. Every value
// comes from settings (site, contact, seo.defaults.organization), the
// services collection and the page templates; nothing about the business is
// written here. Phase 8 renders them in the layouts and pages.

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

export type ArticleJsonLd = {
  "@context": "https://schema.org"
  "@type": "Article"
  headline: string
  description: string
  image: string
  url: string
  datePublished?: string
  articleSection: string
  author: { "@type": "Organization"; name: string }
  publisher: { "@id": string }
}

/** The business on every page, from SiteSources (origin: the public origin). */
export function siteJsonLd(s: SiteSources, origin: string): OrganizationJsonLd {
  const { site, contact } = s.settings
  const org = s.settings["seo.defaults"].organization
  const values = placeholders(s)
  return organizationJsonLd({
    type: org.type,
    url: origin,
    name: site.name,
    legalName: site.legalName,
    logo: absoluteUrl(origin, site.logo.url),
    telephone: contact.office,
    email: contact.email,
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
      name: interpolate(service.content.title, values),
      url: absoluteUrl(origin, `/services/${service.slug}`),
    })),
  })
}

/** Home > Services > the service; null for an unknown slug. */
export function serviceJsonLd(
  s: SiteSources,
  slug: string,
  origin: string
): BreadcrumbJsonLd[] | null {
  const service = s.services.find((x) => x.slug === slug)
  if (!service) return null
  const { detail } = s.pages.services.data
  return [
    breadcrumbJsonLd([
      {
        name: s.settings.navigation.breadcrumbHome,
        url: absoluteUrl(origin, "/"),
      },
      {
        name: detail.breadcrumbLabel,
        url: absoluteUrl(origin, "/services"),
      },
      {
        name: interpolate(service.content.title, placeholders(s)),
        url: absoluteUrl(origin, `/services/${slug}`),
      },
    ]),
  ]
}

/** Article + Home > Blog > the article; null for an unknown slug. */
export function articleJsonLdFor(
  s: SiteSources,
  slug: string,
  origin: string
): (ArticleJsonLd | BreadcrumbJsonLd)[] | null {
  const article = s.articles.find((a) => a.slug === slug)
  if (!article) return null
  const values = placeholders(s)
  const copy = s.pages.blog.data.article
  const headline = interpolate(article.content.title, values)
  const url = absoluteUrl(origin, `/blog/${slug}`)
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline,
      description: interpolate(article.content.excerpt, values),
      image: absoluteUrl(
        origin,
        article.seo.ogImage?.url ?? article.content.cover.url
      ),
      url,
      ...(article.publishedAt
        ? { datePublished: article.publishedAt.toISOString() }
        : {}),
      articleSection: article.category.name,
      author: { "@type": "Organization", name: copy.authorName },
      publisher: { "@id": organizationId(origin) },
    },
    breadcrumbJsonLd([
      {
        name: s.settings.navigation.breadcrumbHome,
        url: absoluteUrl(origin, "/"),
      },
      { name: copy.breadcrumbBlog, url: absoluteUrl(origin, "/blog") },
      { name: headline, url },
    ]),
  ]
}
