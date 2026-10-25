// lib/theme/tokens.ts
import { ADMIN_TOKEN_NAMES, type AdminTokenName } from "./cp-admin"

// Public colour tokens the theme can override: app/globals.css @theme
// `--color-*` brand palette, in declaration order. Names equal globals.css.
export const SITE_TOKENS = [
  "brand",
  "brand-deep",
  "brand-soft",
  "navy",
  "navy-dark",
  "ink",
  "ink-soft",
  "body",
  "subtle",
  "line",
  "surface",
  "sky",
  "sky-soft",
  "star",
] as const
export type SiteToken = (typeof SITE_TOKENS)[number]

// Page backgrounds: "fix automatically" moves the other colour (MK R6).
export const SITE_SURFACES: readonly SiteToken[] = [
  "surface",
  "brand-soft",
  "sky-soft",
]

// One list: A1's admin token names (app/(admin)/admin/admin.css, minus
// --radius), in MK order.
export const ADMIN_TOKENS = ADMIN_TOKEN_NAMES
export type AdminToken = AdminTokenName
