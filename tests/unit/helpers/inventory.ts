import { readFileSync } from "node:fs"

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
 * footer.addressLine2, footer.contactOfficeLine and contact.email.
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
  {}

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
])

/** Where an inventory target lives now: normalised, then relocated (`null` = removed). */
export function currentTarget(target: string): string | null {
  const path = normalise(target)
  return Object.hasOwn(RELOCATED_SINCE_BASELINE, path)
    ? RELOCATED_SINCE_BASELINE[path]
    : path
}
