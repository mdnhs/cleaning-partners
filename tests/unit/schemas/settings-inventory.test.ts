import { describe, expect, it } from "vitest"

import { settingsSchemas, type SettingsKey } from "@/lib/schemas/settings"

import {
  DERIVED_SETTINGS_PATHS,
  inventory,
  normalise,
} from "../helpers/inventory"
import { schemaPaths } from "../helpers/schema-paths"

const keys = Object.keys(settingsSchemas) as SettingsKey[]
const targets = inventory
  .map((e) => ({ ...e, path: normalise(e.target) }))
  .filter((e) => e.path.startsWith("settings."))
  .filter((e) => !DERIVED_SETTINGS_PATHS.has(e.path))
  // Derived values (tel: hrefs, ...) are computed from stored fields.
  .filter((e) => !e.derived)

/** The longest settings key that prefixes `path`. */
const keyOf = (path: string) =>
  keys
    .filter((k) => path.startsWith(`settings.${k}.`))
    .sort((a, b) => b.length - a.length)[0]

describe("settings schemas cover docs/brief-inventory.json", () => {
  it("every settings.* target names a CP settings key", () => {
    expect(targets.filter((e) => !keyOf(e.path)).map((e) => e.path)).toEqual([])
  })

  it("covers a good share of the inventory", () => {
    expect(targets.length).toBeGreaterThan(100)
  })

  it.each(keys)("settings.%s has a field for every inventory target", (key) => {
    const prefix = `settings.${key}.`
    const paths = schemaPaths(settingsSchemas[key])
    const known = new Set([...paths.leaves, ...paths.lists])
    const wanted = new Set(
      targets
        .filter((e) => keyOf(e.path) === key)
        .map((e) => e.path.slice(prefix.length))
        .filter((p) => !p.endsWith("[].*"))
    )
    expect([...wanted].filter((p) => !known.has(p))).toEqual([])
  })

  it("template entries sharing a target have equal seeds", () => {
    const seeds = new Map<string, Set<string>>()
    // List items ("lines[]") legitimately differ: one entry per item.
    for (const e of inventory.filter(
      (x) => x.template && x.seed && !x.target.endsWith("[]")
    ))
      seeds.set(
        e.target,
        (seeds.get(e.target) ?? new Set()).add(e.seed as string)
      )
    const clashes = [...seeds].filter(([, set]) => set.size > 1)
    expect(clashes).toEqual([])
  })
})
