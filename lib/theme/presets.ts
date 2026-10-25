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

// CP's public palette, verbatim from app/globals.css @theme; slot names are
// the globals.css token names (tests/unit/theme/presets.test.ts keeps them
// equal). Public colours are
// frozen: the default theme must emit nothing (ruling 4).
export const CP_SITE: Readonly<Record<SiteToken, string>> = deepFreeze({
  brand: "#11b1d1",
  "brand-deep": "#0e93ad",
  "brand-soft": "#e3f6fa",
  navy: "#28648f",
  "navy-dark": "#1c3f5a",
  ink: "#212121",
  "ink-soft": "#3d4650",
  body: "#5a6470",
  subtle: "#7a8590",
  line: "#e1eef3",
  surface: "#f4f9fb",
  sky: "#b9e2f3",
  "sky-soft": "#e6f4fa",
  star: "#f5b301",
})

// Every preset is one shift from the base tables (CP_SITE, CP_ADMIN_*): the
// site's brand family (brand, brand-deep, brand-soft) follows `site.brand`,
// the admin follows `admin.primary`. The non-default site brands are the
// brief's colours after "fix all" (lightened so navy-dark text on the
// brand-soft tint clears 4.5:1), baked in as hex so every preset passes
// SITE_PAIRS unmodified.
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
    admin: { primary: "#0a778d" },
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
