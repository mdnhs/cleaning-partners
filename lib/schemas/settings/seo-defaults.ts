import { z } from "zod"

import { httpUrl, mediaRef, text } from "../common"

/** schema.org types the business presents as. */
export const ORGANIZATION_TYPES = [
  "LocalBusiness",
  "ProfessionalService",
] as const

/**
 * A number typed as text, blank allowed (the schema leaves it out):
 * latitude, longitude, the Google rating and its review count.
 */
const numberText = (
  max: number,
  min: number,
  top: number,
  message: string,
  integer = false
) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => {
      if (value === "") return true
      const n = Number(value)
      return (
        /^-?\d+(\.\d+)?$/.test(value) &&
        n >= min &&
        n <= top &&
        (!integer || Number.isInteger(n))
      )
    }, message)
    .default("")

/**
 * The business fields without the cross-field checks, for schemas that
 * pick or omit fields (zod refuses .omit() on a refined object).
 */
export const organizationFields = z.object({
  type: z.enum(ORGANIZATION_TYPES),
  streetAddress: text,
  addressLocality: text,
  addressRegion: text,
  postalCode: text,
  addressCountry: z
    .string()
    .regex(/^[A-Z]{2}$/, "Two capital letters, e.g. IE"),
  /** ISO 4217; job pay in Google for Jobs (lib/seo/job-posting.ts). */
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Three capital letters, e.g. EUR")
    .refine(
      (code) => Intl.supportedValuesOf("currency").includes(code),
      "Not a known currency code, e.g. EUR"
    ),
  areaServed: text,
  /** Official profiles (LinkedIn, Facebook …). */
  sameAs: z.array(httpUrl).max(10),
  // Local-search details (added after 0013: stored rows read the defaults).
  // Blank ones are left out of the JSON-LD.
  /** e.g. €€; schema.org priceRange. */
  priceRange: z.string().trim().max(10).default(""),
  /** More places served, after areaServed. */
  otherAreas: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  latitude: numberText(
    20,
    -90,
    90,
    "A latitude between -90 and 90, e.g. 53.0349"
  ),
  longitude: numberText(
    20,
    -180,
    180,
    "A longitude between -180 and 180, e.g. -7.3238"
  ),
  /** The rating shown on the Google profile, 1 to 5. */
  ratingValue: numberText(5, 1, 5, "A rating from 1 to 5, e.g. 4.9"),
  reviewCount: numberText(
    7,
    1,
    9_999_999,
    "A whole number of reviews, e.g. 120",
    true
  ),
})

/** Business facts for the site-wide JSON-LD (spec §10). */
export const organizationSettings = organizationFields.superRefine(
  (org, ctx) => {
    // A rating means nothing without its count, and the other way round.
    const rating = org.ratingValue !== ""
    const count = org.reviewCount !== ""
    if (rating && !count)
      ctx.addIssue({
        code: "custom",
        path: ["reviewCount"],
        message: "Add the number of reviews, or clear the rating",
      })
    if (count && !rating)
      ctx.addIssue({
        code: "custom",
        path: ["ratingValue"],
        message: "Add the rating, or clear the number of reviews",
      })
    // A map pin needs both coordinates.
    if ((org.latitude === "") !== (org.longitude === ""))
      ctx.addIssue({
        code: "custom",
        path: [org.latitude === "" ? "latitude" : "longitude"],
        message: "Fill in both latitude and longitude, or neither",
      })
  }
)
export type OrganizationSettings = z.infer<typeof organizationSettings>

/** Site-wide robots mode: noindex blocks the whole site (robots.txt + root meta). */
export const ROBOTS_MODES = ["index", "noindex"] as const
export type RobotsMode = (typeof ROBOTS_MODES)[number]

/**
 * Which of the site's four addresses (http/https, with/without www) is the
 * real one; the others 301 to it (lib/seo/canonical-host.ts). off = no
 * redirect.
 */
export const PREFERRED_HOSTS = ["off", "apex", "www"] as const
export type PreferredHost = (typeof PREFERRED_HOSTS)[number]

/**
 * A search-console verification token: the meta tag's content value only.
 * Strict charset, so nothing but the token can reach the <meta> tag.
 */
const verificationToken = z
  .string()
  .max(100)
  .regex(
    /^[A-Za-z0-9_-]*$/,
    'Paste only the code from the tag\'s content="…": letters, numbers, - and _'
  )

/** settings.seo.defaults — site title, "{title} | …" template, default description, share image, business facts, robots mode, verification tokens. */
export const seoDefaultsSettings = z.object({
  title: text,
  titleTemplate: text.refine((value) => value.includes("{title}"), {
    message: "Include {title} where the page name goes",
  }),
  description: text,
  ogImage: mediaRef.nullable(),
  /** The site's X account for twitter:site; blank leaves the tag out. */
  twitterHandle: z
    .string()
    .trim()
    .max(16)
    .regex(/^(@?[A-Za-z0-9_]{1,15})?$/, "An X handle, e.g. @cleaningpartners")
    .default(""),
  organization: organizationSettings,
  robots: z.enum(ROBOTS_MODES),
  /** Rows saved before this field read as off (no migration needed). */
  preferredHost: z.enum(PREFERRED_HOSTS).default("off"),
  verification: z.object({
    google: verificationToken,
    bing: verificationToken,
  }),
  /**
   * /llms.txt: a plain-text guide to the site for AI assistants
   * (llmstxt.org). On by default; a blank summary uses the description.
   */
  llms: z
    .object({
      enabled: z.boolean().default(true),
      summary: z.string().trim().max(1000).default(""),
    })
    // Migration 0048 adds it to stored rows; the editor needs a plain object.
    .default({ enabled: true, summary: "" }),
})
export type SeoDefaultsSettings = z.infer<typeof seoDefaultsSettings>
