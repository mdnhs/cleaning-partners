import type { Metadata } from "next"

import { interpolate, type Placeholders } from "@/lib/interpolate"
import type { Seo } from "@/lib/schemas/common"
import type { SeoDefaultsSettings } from "@/lib/schemas/settings/seo-defaults"
import { OG_IMAGE_SIZE, ogImagePath } from "@/lib/seo/urls"
import { PAGE_PATHS, type PageKey } from "@/templates/registry"

// <head> metadata per public page (spec §10): title and description with
// fallbacks to settings.seo.defaults, canonical, robots, Open Graph and
// Twitter cards. Pure functions of settings values; Phase 8 loads those
// from the DB and calls these from generateMetadata. Relative URLs resolve
// against the metadataBase that siteMetadata sets.

type SeoDefaults = Pick<
  SeoDefaultsSettings,
  "title" | "titleTemplate" | "description"
>

/** A page's own SEO fields; the share image is resolved separately. */
export type PageSeo = Omit<Seo, "ogImage">

export type ShareImage = {
  url: string
  width?: number
  height?: number
  alt?: string
}

/** Trimmed text, or null when blank. */
const filled = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export type PageMetadataInput = {
  key: PageKey
  path?: string
  siteName: string
  defaults: SeoDefaults
  values: Placeholders
  seo: PageSeo
  /** The page's hero title for "{title} | …"; null = the site title (home). */
  heroTitle: string | null
  /** The record's own image, else the site default; null = the generated card. */
  image?: ShareImage | null
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { key, seo, defaults, values } = input
  const path = input.path ?? PAGE_PATHS[key]
  const title =
    filled(seo.title) ??
    (input.heroTitle
      ? interpolate(defaults.titleTemplate, {
          ...values,
          title: input.heroTitle,
        })
      : interpolate(defaults.title, values))
  const description = interpolate(
    filled(seo.description) ?? defaults.description,
    values
  )
  const image: ShareImage = input.image ?? {
    url: ogImagePath("page", key),
    ...OG_IMAGE_SIZE,
  }
  // Social overrides (Open Graph/Twitter only); {placeholders} fill like the own fields.
  const social = (value: string | undefined) => {
    const own = filled(value)
    return own === null ? null : interpolate(own, values)
  }
  const socialTitle = social(seo.ogTitle) ?? title
  const socialDescription = social(seo.ogDescription) ?? description
  return {
    title,
    description,
    alternates: { canonical: filled(seo.canonical) ?? path },
    ...(seo.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      url: path,
      siteName: input.siteName,
      title: socialTitle,
      description: socialDescription,
      images: [image],
    },
    twitter: {
      card: seo.twitterCard ?? "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [{ url: image.url, ...(image.alt ? { alt: image.alt } : {}) }],
    },
  }
}

/** Bundled icon (public/favicon.ico): used until settings.site.favicon is set. */
export const DEFAULT_FAVICON = "/favicon.ico"

export type SiteMetadataInput = {
  origin: string
  defaults: Pick<SeoDefaultsSettings, "description">
  values: Placeholders
  /** URL of settings.site.favicon, if set. */
  favicon: string | null
  robots: SeoDefaultsSettings["robots"]
  verification?: SeoDefaultsSettings["verification"]
}

/**
 * Root-layout metadata: metadataBase (canonical, og:url and share images
 * become absolute on the production origin) and the default description.
 * Site-wide noindex adds a root robots tag; search console tokens are
 * emitted only when set.
 */
export function siteMetadata(input: SiteMetadataInput): Metadata {
  const { google = "", bing = "" } = input.verification ?? {}
  return {
    metadataBase: new URL(input.origin),
    description: interpolate(input.defaults.description, input.values),
    icons: { icon: input.favicon ?? DEFAULT_FAVICON },
    ...(input.robots === "noindex"
      ? { robots: { index: false, follow: false } }
      : {}),
    ...(google || bing
      ? {
          verification: {
            ...(google ? { google } : {}),
            ...(bing ? { other: { "msvalidate.01": bing } } : {}),
          },
        }
      : {}),
  }
}
