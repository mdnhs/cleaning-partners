import { PAGE_LABELS } from "@/lib/admin/page-labels"
import {
  type EditableSettingsKey,
  SETTINGS_ENTRIES,
} from "@/lib/admin/settings-keys"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import type { CollectionName } from "@/lib/schemas/api/collections"
import type { PageKey } from "@/templates/registry"

/**
 * The Website menu: one admin screen per public page, plus custom pages,
 * legal pages and Header & footer. Each screen shows its own page (the "Page"
 * tab) and the parts homed on it. Imported by the client sidebar, so it
 * imports values only from isomorphic modules (types only from templates and
 * the collections schema).
 */
export type WebsiteKey =
  | "home"
  | "about"
  | "services"
  | "blog"
  | "contact"
  | "careers"
  | "custom-pages"
  | "legal"
  | "header-footer"

export type WebsiteScreen = {
  key: WebsiteKey
  label: string
  page: PageKey | null
  permission: PermissionRequest
  kind: "tabs" | "custom-pages" | "legal"
}

export type WebsitePartSource =
  | { kind: "settings"; key: EditableSettingsKey }
  | { kind: "collection"; name: CollectionName }
  | { kind: "route"; href: string }

export type WebsitePart = {
  id: string
  screen: WebsiteKey
  label: string
  source: WebsitePartSource
  permission: PermissionRequest
}

export type WebsiteTab = { id: string; label: string; href: string }

const PAGE_READ: PermissionRequest = { page: ["read"] }
const COLLECTION_READ: PermissionRequest = { collection: ["read"] }

const pageScreen = (
  key: PageKey,
  permission: PermissionRequest = PAGE_READ
): WebsiteScreen => ({
  key,
  label: PAGE_LABELS[key],
  page: key,
  permission,
  kind: "tabs",
})

/** Rail order. Page screens follow PAGE_KEYS (checked by the unit test). */
export const WEBSITE_SCREENS: readonly WebsiteScreen[] = [
  pageScreen("home"),
  pageScreen("about"),
  pageScreen("services"),
  // Authors hold article:read but not page:read.
  pageScreen("blog", { article: ["read"] }),
  pageScreen("contact"),
  pageScreen("careers"),
  {
    key: "custom-pages",
    label: "Custom pages",
    page: null,
    permission: PAGE_READ,
    kind: "custom-pages",
  },
  {
    key: "legal",
    label: "Legal pages",
    page: null,
    permission: PAGE_READ,
    kind: "legal",
  },
  {
    key: "header-footer",
    label: "Header & footer",
    page: null,
    permission: { settings: ["read"] },
    kind: "tabs",
  },
]

const settingsPart = (
  id: string,
  screen: WebsiteKey,
  key: EditableSettingsKey
): WebsitePart => ({
  id,
  screen,
  label: SETTINGS_ENTRIES[key].label,
  source: { kind: "settings", key },
  permission: SETTINGS_ENTRIES[key].read,
})

const collectionPart = (
  id: string,
  screen: WebsiteKey,
  label: string,
  name: CollectionName
): WebsitePart => ({
  id,
  screen,
  label,
  source: { kind: "collection", name },
  permission: COLLECTION_READ,
})

const routePart = (
  id: string,
  screen: WebsiteKey,
  label: string,
  href: string,
  permission: PermissionRequest
): WebsitePart => ({
  id,
  screen,
  label,
  source: { kind: "route", href },
  permission,
})

/** Tab order within each screen. */
export const WEBSITE_PARTS: readonly WebsitePart[] = [
  settingsPart("clients-section", "home", "sections.clients"),
  collectionPart("clients", "home", "Client logos", "clients"),
  settingsPart("why-choose-us", "home", "sections.whyChooseUs"),
  settingsPart("testimonials-section", "home", "sections.testimonials"),
  collectionPart("testimonials", "home", "Testimonials", "testimonials"),
  settingsPart("team-section", "about", "sections.team"),
  collectionPart("team", "about", "Team members", "team"),
  routePart("all-services", "services", "All services", "/admin/services", {
    service: ["read"],
  }),
  settingsPart("how-it-works", "services", "sections.howItWorks"),
  routePart("articles", "blog", "Articles", "/admin/blog", {
    article: ["read"],
  }),
  routePart(
    "categories",
    "blog",
    "Categories",
    "/admin/blog/categories",
    COLLECTION_READ
  ),
  settingsPart("contact-details", "contact", "contact"),
  settingsPart("contact-section", "contact", "sections.contact"),
  settingsPart("map", "contact", "sections.map"),
  routePart("jobs", "careers", "Jobs", "/admin/careers", { job: ["read"] }),
  settingsPart("navigation", "header-footer", "navigation"),
  settingsPart("footer", "header-footer", "footer"),
  settingsPart("microcopy", "header-footer", "microcopy"),
  collectionPart(
    "group-companies",
    "header-footer",
    "Group companies",
    "group-companies"
  ),
]

/**
 * Every part a fixed page renders, except the every-page chrome (navigation,
 * footer, group companies). Checked against templates/<page>/view.ts and
 * templates/shared/views.ts: the contact section's cards and quote box read
 * settings.contact and microcopy.quoteCard; page heroes read
 * microcopy.breadcrumbAria; textView/linkView/hrefView fill {placeholders}
 * from settings.contact; the contact page's quote form lists the services.
 */
export const PAGE_SHOWS: Record<PageKey, readonly string[]> = {
  home: [
    "clients-section",
    "clients",
    "all-services",
    "why-choose-us",
    "testimonials-section",
    "testimonials",
    "team-section",
    "team",
    "articles",
    "contact-section",
    "contact-details",
    "map",
    "microcopy",
  ],
  about: [
    "clients-section",
    "clients",
    "why-choose-us",
    "team-section",
    "team",
    "testimonials-section",
    "testimonials",
    "contact-section",
    "contact-details",
    "microcopy",
  ],
  services: [
    "all-services",
    "how-it-works",
    "why-choose-us",
    "clients-section",
    "clients",
    "testimonials-section",
    "testimonials",
    "contact-section",
    "contact-details",
    "microcopy",
  ],
  blog: [
    "articles",
    "categories",
    "contact-section",
    "contact-details",
    "microcopy",
  ],
  contact: [
    "contact-details",
    "contact-section",
    "map",
    "all-services",
    "microcopy",
  ],
  careers: ["jobs", "contact-details", "microcopy"],
}

/** Identity and operations: stay under Site settings, not Website. */
export const SITE_SETTINGS_KEYS = [
  "site",
  "leads",
  "careers",
] as const satisfies readonly EditableSettingsKey[]

export function isWebsiteKey(value: string): value is WebsiteKey {
  return WEBSITE_SCREENS.some((screen) => screen.key === value)
}

export const websiteHref = (key: WebsiteKey) => `/admin/website/${key}`

const screenOf = (key: WebsiteKey) =>
  WEBSITE_SCREENS.find((screen) => screen.key === key)!

export function websitePart(
  screen: WebsiteKey,
  id: string
): WebsitePart | undefined {
  return WEBSITE_PARTS.find((part) => part.screen === screen && part.id === id)
}

export function partHref(part: WebsitePart): string {
  return part.source.kind === "route"
    ? part.source.href
    : `${websiteHref(part.screen)}/${part.id}`
}

const toTab = (part: WebsitePart): WebsiteTab => ({
  id: part.id,
  label: part.label,
  href: partHref(part),
})

/** The screen's tabs these roles may read: "Page" first, then its parts. */
export function websiteTabs(
  screen: WebsiteKey,
  roles: readonly string[]
): WebsiteTab[] {
  const tabs: WebsiteTab[] = []
  if (screenOf(screen).page && hasPermission(roles, PAGE_READ))
    tabs.push({ id: "page", label: "Page", href: websiteHref(screen) })
  for (const part of WEBSITE_PARTS)
    if (part.screen === screen && hasPermission(roles, part.permission))
      tabs.push(toTab(part))
  return tabs
}

/** Parts this page shows that are homed on another screen ("Shared on this page"). */
export function sharedOnPage(
  page: PageKey,
  roles: readonly string[]
): (WebsiteTab & { screenLabel: string })[] {
  return PAGE_SHOWS[page].flatMap((id) => {
    const part = WEBSITE_PARTS.find((p) => p.id === id)
    if (!part || part.screen === page || !hasPermission(roles, part.permission))
      return []
    return [{ ...toTab(part), screenLabel: screenOf(part.screen).label }]
  })
}

const settingsPartOf = (key: string) =>
  WEBSITE_PARTS.find(
    (part) => part.source.kind === "settings" && part.source.key === key
  )

export function isWebsiteSettingsKey(key: string): boolean {
  return settingsPartOf(key) !== undefined
}

/** Where a settings key is edited: its Website part, else Site settings. */
export function adminHrefForSettings(key: EditableSettingsKey): string {
  const part = settingsPartOf(key)
  return part ? partHref(part) : `/admin/settings/${key}`
}

/** Where a collection is edited (categories live under Blog). */
export function adminHrefForCollection(name: CollectionName): string {
  if (name === "categories") return "/admin/blog/categories"
  const part = WEBSITE_PARTS.find(
    (p) => p.source.kind === "collection" && p.source.name === name
  )
  // Every other collection has a part (pinned by the unit test).
  return part ? partHref(part) : `/admin/collections/${name}`
}

/** The screen a builder page returns to: legal pages or custom pages. */
export function backLinkForBuilderPage(page: { legalOrder: number | null }): {
  href: string
  label: string
} {
  const key: WebsiteKey = page.legalOrder === null ? "custom-pages" : "legal"
  return { href: websiteHref(key), label: screenOf(key).label }
}

/** Appends the query (repeated keys for arrays, undefined dropped). */
export function withSearch(
  href: string,
  search: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(search)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value])
      params.append(name, item)
  }
  const query = params.toString()
  return query ? `${href}?${query}` : href
}
