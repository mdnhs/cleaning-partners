import type {
  Article,
  BreadcrumbList,
  LocalBusiness,
  WithContext,
} from "schema-dts"

// schema.org JSON-LD (spec §10), typed with schema-dts. Pure builders;
// templates/shared/structured-data.ts maps SiteSources onto them.

export type OrganizationType = "LocalBusiness" | "ProfessionalService"

export type OrganizationInput = {
  type: OrganizationType
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
  /** Places served, main one first; blanks dropped. */
  areaServed: string[]
  sameAs: string[]
  services: { name: string; url: string }[]
  /** e.g. €€; blank leaves it out. */
  priceRange: string
  /** The map pin; null leaves it out. */
  geo: { latitude: number; longitude: number } | null
  /** The Google rating and its review count; null leaves it out. */
  rating: { value: number; count: number } | null
}

/** One place stays a plain string (as before); several become a list. */
function areaServedOf(areas: string[]): { areaServed?: string | string[] } {
  const places = areas.map((a) => a.trim()).filter(Boolean)
  if (places.length === 0) return {}
  return { areaServed: places.length === 1 ? places[0] : places }
}

export const organizationId = (origin: string) => `${origin}/#organization`

/** The business: a plain LocalBusiness (or ProfessionalService) node. */
export function organizationJsonLd(
  i: OrganizationInput
): WithContext<LocalBusiness> {
  const common = {
    "@id": organizationId(i.url),
    name: i.name,
    legalName: i.legalName,
    url: `${i.url}/`,
    logo: i.logo,
    image: i.logo,
    telephone: i.telephone,
    email: i.email,
    address: { "@type": "PostalAddress" as const, ...i.address },
    ...areaServedOf(i.areaServed),
    ...(i.sameAs.length > 0 ? { sameAs: i.sameAs } : {}),
    ...(i.priceRange ? { priceRange: i.priceRange } : {}),
    ...(i.geo
      ? {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: i.geo.latitude,
            longitude: i.geo.longitude,
          },
        }
      : {}),
    ...(i.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating" as const,
            ratingValue: i.rating.value,
            reviewCount: i.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    makesOffer: i.services.map((service) => ({
      "@type": "Offer" as const,
      itemOffered: {
        "@type": "Service" as const,
        name: service.name,
        url: service.url,
      },
    })),
  }
  return i.type === "ProfessionalService"
    ? {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        ...common,
      }
    : { "@context": "https://schema.org", "@type": "LocalBusiness", ...common }
}

export type ArticleInput = {
  url: string
  headline: string
  description: string
  image: string
  datePublished: string | null
  section: string
  authorName: string
  /** Site origin: the publisher is the business node `<origin>/#organization`. */
  origin: string
}

export function articleJsonLd(i: ArticleInput): WithContext<Article> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: i.headline,
    description: i.description,
    image: i.image,
    url: i.url,
    ...(i.datePublished ? { datePublished: i.datePublished } : {}),
    articleSection: i.section,
    author: { "@type": "Organization", name: i.authorName },
    // A reference to the site-wide business node, not a second description.
    publisher: { "@id": organizationId(i.origin) },
  }
}

export function breadcrumbJsonLd(
  items: readonly { name: string; url: string }[]
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** JSON for a <script type="application/ld+json">: no "<", ">" or "&" can end the script. */
export function jsonLdText(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
