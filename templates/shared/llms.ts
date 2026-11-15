import type { Metadata } from "next"

import { type LlmsLink, llmsText } from "@/lib/seo/llms"
import { absoluteUrl } from "@/lib/seo/urls"
import { PAGE_KEYS, PAGE_PATHS } from "@/templates/registry"

import { articleMetadata, pageMetadata, serviceMetadata } from "./page-meta"
import type { SiteSources } from "./sources"

// /llms.txt from SiteSources: the business from settings (site, contact,
// seo.defaults), its pages, services and articles with the titles and
// descriptions their <head> uses, and the legal pages. Pages hidden from
// search (noindex) are left out, as they are of the sitemap.

/** Newest articles listed; older ones stay reachable from the blog. */
const ARTICLES_MAX = 20

const text = (value: Metadata["title"] | Metadata["description"]) =>
  typeof value === "string" ? value : ""

function link(meta: Metadata, url: string): LlmsLink {
  return {
    title: text(meta.title),
    url,
    description: text(meta.description),
  }
}

export function siteLlms(
  s: SiteSources,
  origin: string,
  legal: readonly { label: string; href: string }[]
): string {
  const { site, contact } = s.settings
  const defaults = s.settings["seo.defaults"]
  const org = defaults.organization
  const address = [
    org.streetAddress,
    org.addressLocality,
    org.addressRegion,
    org.postalCode,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
  const areas = [org.areaServed, ...org.otherAreas]
    .map((a) => a.trim())
    .filter(Boolean)
  const phone = [contact.office, contact.officeExtension]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ext ")
  const details = [
    `Website: ${absoluteUrl(origin, "/")}`,
    phone && `Phone: ${phone}`,
    contact.mobile && `Mobile: ${contact.mobile}`,
    `Email: ${contact.email}`,
    address && `Address: ${address}`,
    contact.hours && `Hours: ${contact.hours}`,
    areas.length > 0 && `Areas served: ${areas.join(", ")}`,
  ].filter((line): line is string => Boolean(line))

  const pages = PAGE_KEYS.filter(
    (key) => key !== "home" && !s.pages[key].seo.noindex
  ).map((key) =>
    link(pageMetadata(s, key), absoluteUrl(origin, PAGE_PATHS[key]))
  )
  const services = s.services
    .filter((service) => !service.seo.noindex)
    .map((service) =>
      link(
        serviceMetadata(s, service.slug),
        absoluteUrl(origin, `/services/${service.slug}`)
      )
    )
  const articles = s.articles
    .filter((article) => !article.seo.noindex)
    .slice(0, ARTICLES_MAX)
    .map((article) =>
      link(
        articleMetadata(s, article.slug),
        absoluteUrl(origin, `/blog/${article.slug}`)
      )
    )

  return llmsText({
    siteName: site.name,
    summary: defaults.llms.summary || defaults.description,
    details,
    pages,
    services,
    articles,
    legal: legal.map((l) => ({
      title: l.label,
      url: absoluteUrl(origin, l.href),
    })),
  })
}
