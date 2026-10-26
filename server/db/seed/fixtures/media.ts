import "server-only"

import type { MediaRef } from "@/lib/schemas/common"

/**
 * Every public/images file that content references. Seeded as media rows
 * with driver "static" and key = URL path, so rendered src stays identical.
 * The 32 map tiles (public/images/home/tiles/) stay in public/ and are not in
 * the library: the map builds their paths from settings.sections.map.
 * `alt` is the library's default alternative text; "" marks a decorative image,
 * which is seeded with isDecorative: true (R6-4).
 */
export const MEDIA = [
  { key: "/images/home/logo.png", alt: "Cleaning Partners" },
  { key: "/images/home/cleaning-partners-logo.png", alt: "Cleaning Partners" },
  { key: "/images/home/hero.png", alt: "" },
  { key: "/images/home/cleaning-the-counter.png", alt: "" },
  { key: "/images/home/vacuuming.png", alt: "" },
  { key: "/images/home/blog-curtains.png", alt: "" },
  { key: "/images/home/why-choose-us.png", alt: "" },
  { key: "/images/home/meet-the-team.png", alt: "" },
  { key: "/images/home/team-temp.png", alt: "" },
  { key: "/images/home/icca.png", alt: "Irish Contract Cleaning Association" },
  { key: "/images/home/icca-member.png", alt: "ICCA" },
  { key: "/images/home/client-hse.png", alt: "HSE" },
  {
    key: "/images/home/client-department-of-education.png",
    alt: "Department of Education",
  },
  { key: "/images/home/client-ids.png", alt: "IDS" },
  { key: "/images/home/client-martin-reddin.png", alt: "Martin Reddin" },
  { key: "/images/home/client-ortus.png", alt: "Ortus" },
  { key: "/images/home/client-opw.png", alt: "OPW" },
  { key: "/images/home/client-als.png", alt: "ALS Life Sciences" },
  { key: "/images/home/security-partners.png", alt: "" },
  { key: "/images/home/mjs-eco.png", alt: "" },
  { key: "/images/home/feature-skilled-cleaners.png", alt: "" },
  { key: "/images/home/feature-trusted-service.png", alt: "" },
  { key: "/images/home/feature-competitive-price.png", alt: "" },
  { key: "/images/home/feature-timely.png", alt: "" },
  { key: "/images/home/phone.svg", alt: "" },
  { key: "/images/home/mail.svg", alt: "" },
  { key: "/images/home/pin.svg", alt: "" },
  { key: "/images/home/clock.svg", alt: "" },
  { key: "/images/home/map-pin.svg", alt: "" },
  { key: "/images/home/check.svg", alt: "" },
  { key: "/images/home/facebook.png", alt: "" },
  { key: "/images/home/instagram.png", alt: "" },
  { key: "/images/services/icon-medical.svg", alt: "" },
  { key: "/images/services/icon-education.svg", alt: "" },
  { key: "/images/services/icon-commercial.svg", alt: "" },
  { key: "/images/services/icon-retail.svg", alt: "" },
  { key: "/images/services/icon-fogging.svg", alt: "" },
  { key: "/images/services/icon-help.svg", alt: "" },
  { key: "/images/services/check.svg", alt: "" },
  { key: "/images/blog/search.svg", alt: "" },
  { key: "/images/contact/chevron.svg", alt: "" },
] as const

export type MediaKey = (typeof MEDIA)[number]["key"]

/** Fixtures reference media by key; the seed runner maps keys to row ids. */
export type MediaLookup = (key: MediaKey) => MediaRef

/**
 * Deterministic ids (valid uuid v7 shape) for unit tests and for the
 * fixture-backed site sources: "00000000-0000-7000-8000-000000000001", …
 */
export function fixtureMediaId(key: MediaKey): string {
  const index = MEDIA.findIndex((m) => m.key === key)
  if (index < 0) throw new Error(`Unknown media key ${key}`)
  return `00000000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
}

export const fixtureMediaLookup: MediaLookup = (key) => ({
  mediaId: fixtureMediaId(key),
})

/** Reverse of fixtureMediaId. */
export function fixtureMediaKey(id: string): MediaKey {
  const index = Number(id.slice(-12)) - 1
  const entry = MEDIA[index]
  if (!entry || fixtureMediaId(entry.key) !== id)
    throw new Error(`Not a fixture media id: ${id}`)
  return entry.key
}
