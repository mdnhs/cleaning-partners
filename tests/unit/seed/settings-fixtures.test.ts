import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { settingsSchemas, type SettingsKey } from "@/lib/schemas/settings"
import {
  fixtureMediaId,
  fixtureMediaKey,
  fixtureMediaLookup,
  MEDIA,
} from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import {
  DERIVED_SETTINGS_PATHS,
  inventory,
  normalise,
} from "../helpers/inventory"

const fixture = settingsFixture(fixtureMediaLookup)
const keys = Object.keys(settingsSchemas) as SettingsKey[]

/** Every { mediaId } in a value. */
function mediaIds(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) mediaIds(v, out)
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.mediaId === "string") out.add(record.mediaId)
    for (const v of Object.values(record)) mediaIds(v, out)
  }
  return out
}

/** Values at a dotted path with "[]" fan-out; media refs become their key. */
function valuesAt(root: unknown, path: string): unknown[] {
  let current: unknown[] = [root]
  for (const segment of path.split(".")) {
    const [name, ...brackets] = segment.split("[]")
    current = current.flatMap((node) => {
      let next: unknown[] = [
        name === ""
          ? node
          : (node as Record<string, unknown> | undefined)?.[name],
      ]
      for (let i = 0; i < brackets.length; i++)
        next = next.flatMap((n) => (Array.isArray(n) ? n : []))
      return next
    })
  }
  return current.map((v) =>
    v && typeof v === "object" && "mediaId" in v
      ? fixtureMediaKey((v as { mediaId: string }).mediaId)
      : v
  )
}

const LEGAL_HREFS: Record<string, string> = {
  "settings.footer.privacyHref": "/privacy",
  "settings.footer.termsHref": "/terms",
}

describe("settings fixtures are verbatim from the inventory (master 3.1)", () => {
  it("has a fixture for every settings key and parses the lot", () => {
    for (const key of keys)
      expect(settingsSchemas[key].safeParse(fixture[key]).success, key).toBe(
        true
      )
  })

  const entries = inventory
    .map((e) => ({ ...e, path: normalise(e.target) }))
    .filter((e) => e.path.startsWith("settings."))
    .filter((e) => !e.derived && !DERIVED_SETTINGS_PATHS.has(e.path))
    .filter((e) => !/^[{]/.test(e.value))

  it("checks a good share of the inventory", () => {
    expect(entries.length).toBeGreaterThan(100)
  })

  it.each(entries.map((e) => [e.id, e] as const))("%s", (_id, entry) => {
    const key = keys
      .filter((k) => entry.path.startsWith(`settings.${k}.`))
      .sort((a, b) => b.length - a.length)[0]
    const path = entry.path.slice(`settings.${key}.`.length)
    const found = valuesAt(fixture[key], path)
    if (entry.array) {
      // "5" = the number of items in the list.
      const list = found[0] as unknown[]
      expect(Array.isArray(list), entry.path).toBe(true)
      expect(list).toHaveLength(Number(entry.value))
      return
    }
    // Task 10: the frozen inventory has "#" for the footer legal links; they
    // now point at the new /privacy and /terms pages.
    const expected =
      LEGAL_HREFS[entry.path] ?? (entry.template ? entry.seed : entry.value)
    expect(found, `${entry.path} (${entry.source})`).toContain(expected)
  })

  it("seeds the strings the brief singles out exactly", () => {
    expect(fixture.contact.hours).toBe("Mon–Fri: 9am – 6pm")
    expect(fixture.contact.addressLine2).toBe("Co. Laois, Ireland. R32 YX49")
    expect(fixture.footer.addressLine2).toBe("Co. Laois, R32 YX49")
    expect(fixture.footer.contactOfficeLine).toBe(
      "Tel: {office} Ext {officeExtension}"
    )
    expect(fixture["sections.contact"].infoCards[0].lines).toEqual([
      "Tel: {office} Ext {officeExtension}",
      "Mobile: {mobile}",
      "24hr contact: {phone24h}",
    ])
  })

  it("uses only library images", () => {
    const used = mediaIds(fixture)
    expect(used.size).toBeGreaterThan(15)
    for (const id of used)
      expect(MEDIA.map((m) => m.key)).toContain(fixtureMediaKey(id))
  })

  it("library keys are files in public/ and ids round-trip", () => {
    for (const { key } of MEDIA)
      expect(existsSync(resolve("public", `.${key}`)), key).toBe(true)
    expect(fixtureMediaKey(fixtureMediaId("/images/home/hero.png"))).toBe(
      "/images/home/hero.png"
    )
    expect(() =>
      fixtureMediaKey("00000000-0000-7000-8000-000000009999")
    ).toThrow()
  })

  it("keeps the reference site's name out, except in the team blurb", () => {
    const sister = "sister company to "
    const text = JSON.stringify(fixture)
    // The one place CP's own copy names the sister company.
    expect(fixture["sections.team"].description).toContain(sister)
    expect(text.replace(fixture["sections.team"].description, "")).not.toMatch(
      /Security/
    )
  })
})
