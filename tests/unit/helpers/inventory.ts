import { readFileSync } from "node:fs"

import { expect } from "vitest"

export type InventoryEntry = {
  id: string
  source: string
  kind: string
  target: string
  value: string
  seed?: string
  array?: string
  derived?: boolean
  template?: boolean
}

export const inventory = (
  JSON.parse(readFileSync("docs/brief-inventory.json", "utf8")) as {
    entries: InventoryEntry[]
  }
).entries

/** "articles[18-years-…].title" → "articles[].title". */
export const normalise = (target: string) =>
  target
    .replace(/\[[a-z0-9-]+\]/g, "[]")
    // The two quote-form extra options are items of one `extraOptions` list.
    .replace(/\.extraOption\d$/, ".extraOptions[]")

/**
 * Settings paths the site derives at render instead of storing: the footer's
 * four contact lines are composed from contact.addressLine1,
 * contact.addressLine2, footer.contactOfficeLine and contact.email.
 */
export const DERIVED_SETTINGS_PATHS = new Set(["settings.footer.contactLines"])

/**
 * Inventory targets whose field moved (or was removed) after the baseline
 * (3689369). Key: the old target as `normalise` returns it. Value: the new
 * normalised target ("pages.<page>.…" or "settings.<key>.…") where the
 * value now lives, or `null` when the field is gone. The inventory tests
 * check each entry at `currentTarget(entry.target)` and skip `null`.
 * fixtures.test checks every key is a real target and every new target a
 * live schema path. Add one line per moved field, with a comment saying why.
 */
export const RELOCATED_SINCE_BASELINE: Readonly<Record<string, string | null>> =
  {
    // One ICCA badge for the home hero and the contact section, edited in
    // Settings › Site › Membership (phase 2, task 7; migration 0039).
    "pages.home.hero.memberLogo": "settings.site.membership.logo",
    "pages.home.hero.memberLogoAlt": "settings.site.membership.logoAlt",
    "settings.sections.contact.memberLogo": "settings.site.membership.logo",
    "settings.sections.contact.memberLogoAlt":
      "settings.site.membership.logoAlt",
    "settings.sections.contact.memberSubtitle": "settings.site.membership.name",
    // The footer prints the address from Settings › Contact instead of its
    // own copy of the second line (phase 2, task 8; migration 0040).
    "settings.footer.addressLine2": "settings.contact.addressLine2",
    // Why choose us shares one icon-cards shape with the careers benefits,
    // whose list is `cards` (phase 2, task 10; migration 0042).
    "settings.sections.whyChooseUs.features":
      "settings.sections.whyChooseUs.cards",
    "settings.sections.whyChooseUs.features[].title":
      "settings.sections.whyChooseUs.cards[].title",
    "settings.sections.whyChooseUs.features[].description":
      "settings.sections.whyChooseUs.cards[].description",
    "settings.sections.whyChooseUs.features[].icon":
      "settings.sections.whyChooseUs.cards[].icon",
  }

/**
 * Inventory entries whose seeded value was changed on purpose after the
 * baseline. Key: the entry's `id` (stable even when the field is relocated).
 * Value: why. The fixture tests assert such a value is still seeded and
 * differs from the baseline instead of matching it verbatim.
 */
export const CHANGED_SINCE_BASELINE: ReadonlyMap<string, string> = new Map([
  [
    "quoteForm.sent",
    "The mailto handoff was removed when the form began posting to the leads API (7.3).",
  ],
  [
    "serviceDetail.officeHours.hours",
    "Office hours follow Settings › Contact ({hours}), whose en dash is unspaced.",
  ],
  [
    "contact.member.logo",
    "The contact card shows the one membership logo (icca.png, the same artwork as icca-member.png).",
  ],
  [
    "contact.member.logoAlt",
    "The one membership logo's alt text is the association's full name.",
  ],
  [
    "footer.contactLines.address2",
    "The footer's second address line is Settings › Contact's, which includes \"Ireland.\".",
  ],
  ...(
    [
      "navigation.cta.href",
      "home.hero.primaryCta.href",
      "about.story.cta.href",
      "services.grid.quote.href",
      "services.grid.help.cta.href",
      "quoteCard.cta.href",
    ] as const
  ).map(
    (id) =>
      [
        id,
        "Quote buttons go to Settings › Contact's {quoteHref} (/contact#quote), which works on every page; #contact did not.",
      ] as const
  ),
  [
    "services.grid.quote.label",
    'The services quote button reads Settings › Contact\'s {quoteLabel} ("Get a Free Quote"), like every other quote button.',
  ],
])

/** Where an inventory target lives now: normalised, then relocated (`null` = removed). */
export function currentTarget(target: string): string | null {
  const path = normalise(target)
  return Object.hasOwn(RELOCATED_SINCE_BASELINE, path)
    ? RELOCATED_SINCE_BASELINE[path]
    : path
}

/**
 * A `CHANGED_SINCE_BASELINE` entry's seeded value (placeholders filled unless
 * it is a template) is still there and no longer the baseline's: a list
 * entry's item count differs; any other entry is a string other than the
 * baseline value.
 */
export function expectChangedSinceBaseline(
  entry: InventoryEntry,
  actual: unknown
) {
  if (entry.array) {
    expect(Array.isArray(actual), `${entry.id}: a list`).toBe(true)
    expect((actual as unknown[]).length, entry.id).not.toBe(Number(entry.value))
    return
  }
  expect(typeof actual, `${entry.id}: a seeded string`).toBe("string")
  expect(actual, entry.id).not.toBe(entry.template ? entry.seed : entry.value)
}
