import { interpolate } from "@/lib/interpolate"
import {
  articleJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
} from "@/lib/seo/json-ld"
import { absoluteUrl } from "@/lib/seo/urls"

import type { SiteSources } from "./sources"
import { placeholders } from "./views"

// schema.org JSON-LD (spec §10) from SiteSources: the business on every
// page, Article on articles and BreadcrumbList on detail pages. Every value
// comes from settings (site, contact, seo.defaults.organization), the
// services collection and the page templates; nothing about the business is
// written here. The builders live in lib/seo/json-ld.ts; SiteExtras and the
// detail pages render the output through components/seo/json-ld.tsx.

/** The business on every page, from SiteSources (origin: the public origin). */
export function siteJsonLd(s: SiteSources, origin: string) {
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
): ReturnType<typeof breadcrumbJsonLd>[] | null {
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
): object[] | null {
  const article = s.articles.find((a) => a.slug === slug)
  if (!article) return null
  const values = placeholders(s)
  const copy = s.pages.blog.data.article
  const headline = interpolate(article.content.title, values)
  const url = absoluteUrl(origin, `/blog/${slug}`)
  return [
    articleJsonLd({
      headline,
      description: interpolate(article.content.excerpt, values),
      image: absoluteUrl(
        origin,
        article.seo.ogImage?.url ?? article.content.cover.url
      ),
      url,
      datePublished: article.publishedAt?.toISOString() ?? null,
      section: article.category.name,
      authorName: copy.authorName,
      origin,
    }),
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
