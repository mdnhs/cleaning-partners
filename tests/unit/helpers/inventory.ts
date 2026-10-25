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
  target.replace(/\[[a-z0-9-]+\]/g, "[]")

/**
 * Settings paths the site derives at render instead of storing: the footer's
 * four contact lines are composed from contact.addressLine1,
 * footer.addressLine2, footer.contactOfficeLine and contact.email.
 */
export const DERIVED_SETTINGS_PATHS = new Set(["settings.footer.contactLines"])
