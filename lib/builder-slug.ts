// Builder page addresses (/p/<slug>) without zod, so proxy.ts can check a
// slug without loading the block schemas.
// lib/schemas/api/builder-pages `builderSlug` is built from these.

export const BUILDER_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const BUILDER_SLUG_MAX = 60

/**
 * Slugs under /p/ that are refused although they fit the format: they read
 * as the site's own areas (Review Focus 1, "/p/admin").
 */
export const RESERVED_BUILDER_SLUGS = [
  "admin",
  "api",
  "og",
  "images",
  "p",
] as const

const RESERVED = new Set<string>(RESERVED_BUILDER_SLUGS)

export const isReservedBuilderSlug = (slug: string) => RESERVED.has(slug)

/** A well-formed, unreserved builder slug (what `builderSlug` accepts). */
export function isBuilderSlug(slug: string): boolean {
  return (
    slug.length <= BUILDER_SLUG_MAX &&
    BUILDER_SLUG_PATTERN.test(slug) &&
    !RESERVED.has(slug)
  )
}

// ---------------------------------------------------------------- legal pages
// Legal pages (Privacy, Terms, Cookies …) are builder pages served at the
// site root, /<slug>, so their slugs share the namespace of the site's own
// routes: none of those may be taken.

/** Single-segment addresses the site already answers to (routes, files). */
export const RESERVED_LEGAL_SLUGS = [
  ...RESERVED_BUILDER_SLUGS,
  "about",
  "services",
  "blog",
  "contact",
  "sitemap",
  "robots",
  "favicon",
] as const

const RESERVED_LEGAL = new Set<string>(RESERVED_LEGAL_SLUGS)

export const isReservedLegalSlug = (slug: string) => RESERVED_LEGAL.has(slug)

/** Public address of a legal page. */
export const legalPath = (slug: string) => `/${slug}`

/** A well-formed, unreserved legal slug. */
export function isLegalSlug(slug: string): boolean {
  return (
    slug.length <= BUILDER_SLUG_MAX &&
    BUILDER_SLUG_PATTERN.test(slug) &&
    !RESERVED_LEGAL.has(slug)
  )
}
