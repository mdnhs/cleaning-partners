import { describe, expect, it } from "vitest"

import { GROWTH_SETTINGS_KEYS } from "@/lib/admin/growth-settings"
import {
  EDITABLE_SETTINGS_KEYS,
  isEditableSettingsKey,
  SETTINGS_ENTRIES,
  SETTINGS_GROUPS,
} from "@/lib/admin/settings-keys"
import { SETTINGS_KEYS } from "@/lib/schemas/settings"

/** Edited elsewhere: Marketing, SEO and Appearance (not under Settings). */
const ELSEWHERE = ["consent", "tracking", "customCode", "seo.defaults", "theme"]

describe("settings key registry (R3-1)", () => {
  it("EDITABLE ∪ {consent, tracking, customCode, seo.defaults, theme} equals SETTINGS_KEYS", () => {
    expect([...EDITABLE_SETTINGS_KEYS, ...ELSEWHERE].sort()).toEqual(
      [...SETTINGS_KEYS].sort()
    )
  })

  it("the editable and elsewhere sets do not overlap", () => {
    for (const key of ELSEWHERE)
      expect((EDITABLE_SETTINGS_KEYS as readonly string[]).includes(key)).toBe(
        false
      )
  })

  it("growth keys are a subset of the elsewhere set", () => {
    for (const key of GROWTH_SETTINGS_KEYS) expect(ELSEWHERE).toContain(key)
  })

  it("lists the CP editable keys in tab order", () => {
    expect([...EDITABLE_SETTINGS_KEYS]).toEqual([
      "site",
      "contact",
      "navigation",
      "footer",
      "microcopy",
      "sections.clients",
      "sections.whyChooseUs",
      "sections.testimonials",
      "sections.team",
      "sections.contact",
      "sections.map",
      "sections.howItWorks",
      "leads",
    ])
  })

  it("has no keys or copy left over from the reference site", () => {
    const text = JSON.stringify(SETTINGS_ENTRIES)
    expect(text).not.toMatch(/enquire|About section/i)
    for (const name of ["about", "enquire" + "Banner"])
      expect(isEditableSettingsKey(`sections.${name}`)).toBe(false)
  })

  it("every entry has a label, a description and a known group", () => {
    for (const key of EDITABLE_SETTINGS_KEYS) {
      const entry = SETTINGS_ENTRIES[key]
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(SETTINGS_GROUPS).toContain(entry.group)
    }
  })

  it("only leads needs more than settings:update", () => {
    for (const key of EDITABLE_SETTINGS_KEYS)
      expect(SETTINGS_ENTRIES[key].update).toEqual(
        key === "leads"
          ? { settings: ["update"], lead: ["update"] }
          : { settings: ["update"] }
      )
  })
})
