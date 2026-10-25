// lib/theme/presets.ts
import { deepFreeze } from "./freeze"
import type { SiteToken } from "./tokens"

export const PRESET_IDS = [
  "cleaning-partners",
  "evergreen",
  "ocean",
  "plum",
  "terracotta",
  "graphite",
] as const
export type PresetId = (typeof PRESET_IDS)[number]

// CP's public palette from app/globals.css @theme (--color-brand* / navy /
// ink / line / surface), mapped onto the engine's token slots. Task 2.5b / 9
// re-derive the slot names from CP's globals.css.
// (tests/unit/theme/presets.test.ts keeps them equal). Public colours are
// frozen: the default theme must emit nothing (ruling 4).
export const CP_SITE: Readonly<Record<SiteToken, string>> = deepFreeze({
  "brand-navy": "#1c3f5a",
  "brand-blue": "#28648f",
  "brand-blue-deep": "#1c3f5a",
  "brand-green": "#11b1d1",
  "brand-green-dark": "#0e93ad",
  "brand-mint": "#e3f6fa",
  "brand-surface": "#f4f9fb",
  "brand-line": "#e1eef3",
  "brand-ink": "#3d4650",
  "brand-muted": "#7a8590",
  "brand-placeholder": "#a0aec0",
  "brand-map": "#e8eae6",
})

// Every preset is one shift from the base tables (CP_SITE, CP_ADMIN_*): the
// site's green family follows `site.brand`, the admin follows
// `admin.primary`. The non-SP site brands are the brief's colours after
// "fix all" (lightened so navy text on the consent button clears 4.5:1),
// baked in as hex so every preset passes SITE_PAIRS unmodified.
export const PRESETS: Readonly<
  Record<
    PresetId,
    {
      readonly label: string
      readonly site: { readonly brand: string }
      readonly admin: { readonly primary: string }
    }
  >
> = deepFreeze({
  "cleaning-partners": {
    label: "Cleaning Partners",
    site: { brand: "#11b1d1" },
    admin: { primary: "#0b7d94" },
  },
  evergreen: {
    label: "Evergreen",
    site: { brand: "#49925e" },
    admin: { primary: "#157d38" },
  },
  ocean: {
    label: "Ocean",
    site: { brand: "#5888b6" },
    admin: { primary: "#2f5f8a" },
  },
  plum: {
    label: "Plum",
    site: { brand: "#a475a4" },
    admin: { primary: "#6a3f6b" },
  },
  terracotta: {
    label: "Terracotta",
    site: { brand: "#b9705b" },
    admin: { primary: "#9a4a32" },
  },
  graphite: {
    label: "Graphite",
    site: { brand: "#80858c" },
    admin: { primary: "#4a4f55" },
  },
})
