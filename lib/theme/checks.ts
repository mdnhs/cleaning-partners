// lib/theme/checks.ts
import { buildAdminTokens } from "./admin"
import {
  contrast,
  formatOklch,
  nudge,
  parseColor,
  WHITE,
  type Oklch,
} from "./color"
import type { ThemeConfigValue } from "./schema"
import { BRAND_FAMILY, resolveSiteTokens } from "./site"
import { ADMIN_CONTRAST_PAIRS } from "./cp-admin"
import { SITE_SURFACES, type AdminToken, type SiteToken } from "./tokens"

type Min = 2.5 | 3 | 4.5
type Scope = "site" | "admin-light" | "admin-dark"
export type ContrastIssue = {
  scope: Scope
  text: string
  surface: string
  ratio: number
  min: Min
}
export type PairRating = ContrastIssue & {
  rating: "AAA" | "AA" | "floor" | "fail"
}

// White text on the brand (`bg-brand text-white`) is 2.55:1 today and the
// public colours are frozen, so the floor sits just under today's design.
export const BRAND_TEXT_FLOOR = 2.5

type SiteText = SiteToken | "white"

// The pairs today's public components draw. All pass for CP_SITE as-is.
export const SITE_PAIRS: [SiteText, SiteToken, Min][] = [
  ["ink-soft", "surface", 4.5],
  ["body", "surface", 4.5],
  ["subtle", "surface", 3],
  ["navy-dark", "brand-soft", 4.5],
  ["navy", "surface", 4.5],
  ["white", "brand", BRAND_TEXT_FLOOR],
  ["white", "navy-dark", 4.5],
  ["sky", "navy-dark", 4.5],
]

// One list with A1 (tests/unit/admin/admin-tokens.test.ts enforces it on
// admin.css).
export const ADMIN_PAIRS: [AdminToken, AdminToken, Min][] =
  ADMIN_CONTRAST_PAIRS.map(([text, surface, min]) => [text, surface, min])

const SITE_LABELS: Record<SiteToken, string> = {
  brand: "Brand",
  "brand-deep": "Deep brand",
  "brand-soft": "Brand tint",
  navy: "Navy",
  "navy-dark": "Dark navy",
  ink: "Headings",
  "ink-soft": "Body text",
  body: "Secondary text",
  subtle: "Muted text",
  line: "Lines",
  surface: "Page surface",
  sky: "Sky",
  "sky-soft": "Sky tint",
  star: "Star rating",
}
const ADMIN_LABELS: Partial<Record<AdminToken, string>> = {
  foreground: "Text",
  background: "Canvas",
  card: "Cards",
  "card-foreground": "Card text",
  popover: "Menus",
  "popover-foreground": "Menu text",
  secondary: "Secondary",
  "secondary-foreground": "Text on secondary",
  muted: "Muted fill",
  sidebar: "Panels",
  "sidebar-foreground": "Panel text",
  "muted-foreground": "Muted text",
  primary: "Primary",
  "primary-foreground": "Text on primary",
  "sidebar-primary": "Panel primary",
  "sidebar-primary-foreground": "Text on panel primary",
  accent: "Accent",
  "accent-foreground": "Text on accent",
  "sidebar-accent": "Panel accent",
  "sidebar-accent-foreground": "Text on panel accent",
  destructive: "Destructive text",
  success: "Success text",
  "success-soft": "Success fill",
  warning: "Warning text",
  "warning-soft": "Warning fill",
  danger: "Danger text",
  "danger-soft": "Danger fill",
  "hero-foreground": "Hero text",
  "hero-from": "Hero card",
  "hero-chip": "Hero chip",
  "hero-chip-foreground": "Hero chip text",
  "promo-foreground": "Promo text",
  "promo-from": "Promo card",
  input: "Control edges",
  ring: "Focus ring",
}

export function tokenLabel(scope: Scope, token: string): string {
  return scope === "site"
    ? token === "white"
      ? "White text"
      : (SITE_LABELS[token as SiteToken] ?? token)
    : (ADMIN_LABELS[token as AdminToken] ?? token)
}

export function rating(
  ratio: number,
  min: Min
): "AAA" | "AA" | "floor" | "fail" {
  if (ratio < min) return "fail"
  // A pair held to a floor under 3 passes the floor, not WCAG AA.
  if (min < 3 && ratio < 3) return "floor"
  return ratio >= (min < 4.5 ? 4.5 : 7) ? "AAA" : "AA"
}

export function pairRatings(config: ThemeConfigValue): PairRating[] {
  const rows: PairRating[] = []
  const add = (
    scope: Scope,
    t: Record<string, Oklch>,
    pairs: [string, string, Min][]
  ) => {
    for (const [text, surface, min] of pairs) {
      const ratio = contrast(text === "white" ? WHITE : t[text]!, t[surface]!)
      rows.push({
        scope,
        text,
        surface,
        ratio,
        min,
        rating: rating(ratio, min),
      })
    }
  }
  add("site", resolveSiteTokens(config.site), SITE_PAIRS)
  add("admin-light", buildAdminTokens(config.admin, "light"), ADMIN_PAIRS)
  add("admin-dark", buildAdminTokens(config.admin, "dark"), ADMIN_PAIRS)
  return rows
}

export function checkTheme(config: ThemeConfigValue): ContrastIssue[] {
  return pairRatings(config)
    .filter((r) => r.rating === "fail")
    .map(({ scope, text, surface, ratio, min }) => ({
      scope,
      text,
      surface,
      ratio,
      min,
    }))
}

const SCOPE_PREFIX: Record<Scope, string> = {
  site: "",
  "admin-light": "Admin (light): ",
  "admin-dark": "Admin (dark): ",
}

// Floors to 2 places, so a failing 4.499 never prints as "4.50".
export function describeIssue(issue: ContrastIssue): string {
  const ratio = (Math.floor(issue.ratio * 100) / 100).toFixed(2)
  const use =
    issue.min === 2.5
      ? "today's design"
      : issue.min === 3
        ? "large text and controls"
        : "body text"
  return `${SCOPE_PREFIX[issue.scope]}${tokenLabel(issue.scope, issue.text)} on ${tokenLabel(issue.scope, issue.surface)} is ${ratio}:1; it needs ${issue.min}:1 (${use}).`
}

const stillFails = (config: ThemeConfigValue, issue: ContrastIssue) =>
  checkTheme(config).some(
    (i) =>
      i.scope === issue.scope &&
      i.text === issue.text &&
      i.surface === issue.surface
  )

const PRIMARY_FAMILY = [
  "primary",
  "primary-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "ring",
  "sidebar-ring",
]
const ACCENT_FAMILY = [
  "accent",
  "accent-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
]

// MK Ruling R6: move the coloured side, never a page surface. On the site a
// brand-family surface that is not a page background is the coloured side,
// so it moves rather than the text drawn on it. Every candidate is
// re-checked: when the preferred side cannot clear the pair (a locked
// brand outranks `site.brand`), the other side moves instead, unless
// it is a page surface; failing both, the issue is unfixable (null). A
// config that still fails the pair is never returned.
export function fixIssue(
  config: ThemeConfigValue,
  issue: ContrastIssue
): ThemeConfigValue | null {
  if (issue.scope === "site") {
    const tokens = resolveSiteTokens(config.site)
    const surface = issue.surface as SiteToken
    // White is a fixed colour, not a token: the surface always moves.
    const fixedWhite = issue.text === "white"
    const text = issue.text as SiteToken
    const moveSurface =
      fixedWhite ||
      SITE_SURFACES.includes(text) ||
      (BRAND_FAMILY.includes(surface) && !SITE_SURFACES.includes(surface))
    const preferred = moveSurface ? surface : text
    const other = moveSurface ? text : surface
    const sides =
      fixedWhite || SITE_SURFACES.includes(other)
        ? [preferred]
        : [preferred, other]
    for (const moving of sides) {
      const fixedToken = moving === preferred ? other : preferred
      const fixedColor = fixedWhite ? WHITE : tokens[fixedToken as SiteToken]
      const next = nudge(tokens[moving], fixedColor, issue.min)
      if (!next) continue
      const value = formatOklch(next)
      // brand moves through `site.brand`; a locked brand is the user's
      // explicit choice and outranks it, so that candidate fails the
      // re-check and the other side moves instead.
      const site =
        moving === "brand"
          ? { ...config.site, brand: value }
          : {
              ...config.site,
              tokens: { ...config.site.tokens, [moving]: value },
            }
      const candidate = { ...config, site }
      if (!stillFails(candidate, issue)) return candidate
    }
    return null
  }
  const touches = (names: string[]) =>
    names.includes(issue.text) || names.includes(issue.surface)
  const field = touches(PRIMARY_FAMILY)
    ? "primary"
    : touches(ACCENT_FAMILY)
      ? "accent"
      : null
  if (!field) return null
  const start =
    (config.admin[field] && parseColor(config.admin[field]!)) ||
    buildAdminTokens(config.admin, "light")[field]
  // Light: darken the colour. Dark: its lightness has no effect there (the
  // dark primary keeps the tuned default lightness, see anchor() in admin.ts, and
  // the dark accent is a fixed ramp step), so chroma is the one lever the
  // config has on dark tokens; desaturate step by step towards grey. No
  // dark failure occurs for any primary/accent today (safe by
  // construction); this path exists so a future one is still repairable.
  const light = issue.scope === "admin-light"
  for (let i = 1; i <= 60; i++) {
    const l = light ? start.l - 0.01 * i : start.l
    if (l < 0) break
    const c = light ? start.c : start.c * (1 - i / 60)
    const candidate = {
      ...config,
      admin: { ...config.admin, [field]: formatOklch({ ...start, l, c }) },
    }
    if (!stillFails(candidate, issue)) return candidate
  }
  return null
}

// Greedy and never worse: a fix is kept only when the number of failing
// pairs does not rise, so one repair cannot break three other pairs. The
// best theme seen is returned, whatever order the fixes were tried in.
export function fixAll(config: ThemeConfigValue): {
  config: ThemeConfigValue
  remaining: ContrastIssue[]
} {
  let current = config
  let issues = checkTheme(current)
  let best = { config, remaining: issues }
  const seen = new Set([JSON.stringify(config)])
  for (let round = 0; round < 40 && issues.length > 0; round++) {
    let accepted: {
      config: ThemeConfigValue
      remaining: ContrastIssue[]
    } | null = null
    for (const issue of issues) {
      const candidate = fixIssue(current, issue)
      if (!candidate) continue
      const key = JSON.stringify(candidate)
      if (seen.has(key)) continue
      seen.add(key)
      const remaining = checkTheme(candidate)
      if (remaining.length > issues.length) continue
      // Prefer the first fix that clears a pair outright.
      if (!accepted || remaining.length < accepted.remaining.length)
        accepted = { config: candidate, remaining }
      if (remaining.length < issues.length) break
    }
    if (!accepted) break
    current = accepted.config
    issues = accepted.remaining
    if (issues.length < best.remaining.length)
      best = { config: current, remaining: issues }
  }
  return best
}
