import { describe, expect, it } from "vitest"

import {
  checkTheme,
  describeIssue,
  fixAll,
  fixIssue,
  pairRatings,
  SITE_PAIRS,
} from "@/lib/theme/checks"
import { contrast } from "@/lib/theme/color"
import { buildAdminTokens } from "@/lib/theme/admin"
import { PRESET_IDS } from "@/lib/theme/presets"
import { ColorValue, DEFAULT_THEME, ThemeConfig } from "@/lib/theme/schema"
import { presetSiteTheme, resolveSiteTokens } from "@/lib/theme/site"

const withSite = (site: object) =>
  ThemeConfig.parse({ site: { ...DEFAULT_THEME.site, ...site } })

describe("checkTheme", () => {
  it("the default theme has no issues", () => {
    expect(checkTheme(DEFAULT_THEME)).toEqual([])
  })

  it("pins the SITE_PAIRS from the brief", () => {
    expect(SITE_PAIRS).toEqual([
      ["ink-soft", "surface", 4.5],
      ["body", "surface", 4.5],
      ["subtle", "surface", 3],
      ["navy-dark", "brand-soft", 4.5],
      ["navy", "surface", 4.5],
      ["white", "brand", 2.5],
      ["white", "navy-dark", 4.5],
      ["sky", "navy-dark", 4.5],
    ])
  })

  it("every preset × mode passes admin pairs", () => {
    for (const p of PRESET_IDS)
      expect(
        checkTheme({
          ...DEFAULT_THEME,
          admin: { ...DEFAULT_THEME.admin, preset: p, primary: null },
        }),
        p
      ).toEqual([])
  })

  // Ruling 2: a preset must never hit the publish gate. The non-default site
  // brands are baked in already repaired (presets.ts).
  it("every preset passes SITE_PAIRS and ADMIN_PAIRS unmodified (light+dark)", () => {
    for (const p of PRESET_IDS) {
      const config = {
        site: presetSiteTheme(p),
        admin: { ...DEFAULT_THEME.admin, preset: p },
      }
      expect(checkTheme(config), p).toEqual([])
      const scopes = new Set(pairRatings(config).map((r) => r.scope))
      expect(scopes, p).toEqual(new Set(["site", "admin-light", "admin-dark"]))
    }
  })

  it("rates every pair three times (site + admin light + dark)", () => {
    const rows = pairRatings(DEFAULT_THEME)
    expect(new Set(rows.map((r) => r.scope))).toEqual(
      new Set(["site", "admin-light", "admin-dark"])
    )
    expect(rows.every((r) => r.rating !== "fail")).toBe(true)
  })

  it("finds a failing site pair and explains it in words", () => {
    const issues = checkTheme(withSite({ tokens: { "ink-soft": "#cccccc" } }))
    const ink = issues.find((i) => i.text === "ink-soft")!
    expect(ink).toMatchObject({ scope: "site", min: 4.5 })
    expect(describeIssue(ink)).toMatch(
      /^Body text on Page surface is \d\.\d{2}:1; it needs 4\.5:1 \(body text\)\.$/
    )
  })

  it("never rounds a failing ratio up to the threshold", () => {
    expect(
      describeIssue({
        scope: "admin-dark",
        text: "primary-foreground",
        surface: "primary",
        ratio: 4.4999,
        min: 4.5,
      })
    ).toBe(
      "Admin (dark): Text on primary on Primary is 4.49:1; it needs 4.5:1 (body text)."
    )
  })
})

describe("fix automatically", () => {
  it("a pale primary fails and fixAll repairs it", () => {
    const bad = {
      ...DEFAULT_THEME,
      admin: { ...DEFAULT_THEME.admin, primary: ColorValue.parse("#d4f5c0") },
    }
    expect(checkTheme(bad).length).toBeGreaterThan(0)
    expect(fixAll(bad).remaining).toEqual([])
  })

  it("fixes a site text token by locking a darker value", () => {
    const config = withSite({ tokens: { "ink-soft": "#cccccc" } })
    const [issue] = checkTheme(config)
    const fixed = fixIssue(config, issue!)!
    const tokens = resolveSiteTokens(fixed.site)
    expect(contrast(tokens["ink-soft"], tokens.surface)).toBeGreaterThanOrEqual(
      4.5
    )
    expect(fixed.site.tokens.surface).toBeUndefined()
  })

  it("a pale brand fails white on brand and fixAll repairs it", () => {
    const config = withSite({ brand: "#9fe3f0" })
    const issue = checkTheme(config).find(
      (i) => i.text === "white" && i.surface === "brand"
    )!
    expect(issue).toMatchObject({ scope: "site", min: 2.5 })
    expect(describeIssue(issue)).toMatch(
      /^White text on Brand is \d\.\d{2}:1; it needs 2\.5:1 \(today's design\)\.$/
    )
    const fixed = fixIssue(config, issue)!
    expect(Object.keys(fixed.site.tokens)).not.toContain("white")
    expect(
      checkTheme(fixed).some((i) => i.text === "white" && i.surface === "brand")
    ).toBe(false)
    const all = fixAll(config)
    expect(all.remaining).toEqual([])
    expect(checkTheme(all.config)).toEqual([])
  })

  it("moves the navy text, never the brand-soft page surface", () => {
    const config = withSite({ brand: "#1f3a10" })
    const issue = checkTheme(config).find(
      (i) => i.text === "navy-dark" && i.surface === "brand-soft"
    )
    // A dark brand drags brand-soft down with it: that is the failing pair.
    expect(issue).toBeDefined()
    const fixed = fixIssue(config, issue!)
    expect(fixed).not.toBeNull()
    expect(fixed!.site.brand).toBe(config.site.brand)
    expect(fixed!.site.tokens["brand-soft"]).toBeUndefined()
    const tokens = resolveSiteTokens(fixed!.site)
    expect(
      contrast(tokens["navy-dark"], tokens["brand-soft"])
    ).toBeGreaterThanOrEqual(4.5)
  })

  it("a locked brand-soft is a page surface: the text moves", () => {
    const config = withSite({ tokens: { "brand-soft": "#1f3a10" } })
    const issue = checkTheme(config).find(
      (i) => i.text === "navy-dark" && i.surface === "brand-soft"
    )!
    expect(issue).toBeDefined()
    const fixed = fixIssue(config, issue)!
    expect(fixed).not.toBeNull()
    expect(fixed.site.tokens["brand-soft"]).toBe(
      config.site.tokens["brand-soft"]
    )
    expect(fixed.site.tokens["navy-dark"]).toBeDefined()
    const tokens = resolveSiteTokens(fixed.site)
    expect(
      contrast(tokens["navy-dark"], tokens["brand-soft"])
    ).toBeGreaterThanOrEqual(4.5)
  })

  it("returns null or a config that clears the pair, never a non-fix", () => {
    const configs = [
      withSite({ tokens: { brand: "#1f3a10" } }),
      withSite({
        tokens: { brand: "#777777", "navy-dark": "#777777" },
      }),
      withSite({ brand: "#000000", tokens: { subtle: "#dddddd" } }),
      ThemeConfig.parse({ admin: { primary: "#ffffff", accent: "#ffff00" } }),
    ]
    for (const config of configs)
      for (const issue of checkTheme(config)) {
        const fixed = fixIssue(config, issue)
        if (fixed)
          expect(
            checkTheme(fixed).some(
              (i) =>
                i.scope === issue.scope &&
                i.text === issue.text &&
                i.surface === issue.surface
            ),
            `${issue.scope} ${issue.text}/${issue.surface}`
          ).toBe(false)
      }
  })

  it("the admin dark path changes dark tokens", () => {
    const config = ThemeConfig.parse({
      admin: { primary: "#2f5f8a", accent: "#3366cc" },
    })
    for (const [text, field] of [
      ["ring", "ring"],
      ["accent-foreground", "accent"],
    ] as const) {
      const fixed = fixIssue(config, {
        scope: "admin-dark",
        text,
        surface: text === "ring" ? "background" : "accent",
        ratio: 1,
        min: 4.5,
      })!
      expect(fixed, text).not.toBeNull()
      expect(buildAdminTokens(fixed.admin, "dark")[field], text).not.toEqual(
        buildAdminTokens(config.admin, "dark")[field]
      )
    }
  })
})

describe("fixAll", () => {
  const configs = [
    withSite({ brand: "#000000" }),
    withSite({ brand: "#ffffff" }),
    withSite({ brand: "#000000", tokens: { subtle: "#dddddd" } }),
    withSite({ tokens: { brand: "#1f3a10" } }),
    ThemeConfig.parse({ admin: { primary: "#000000", accent: "#ffff00" } }),
    ThemeConfig.parse({ admin: { primary: "#ffffff" } }),
    ThemeConfig.parse({ admin: { primary: "#d4f5c0", tint: "primary" } }),
  ]

  it("never leaves a theme with more failing pairs", () => {
    for (const config of configs) {
      const before = checkTheme(config).length
      const result = fixAll(config)
      expect(checkTheme(result.config).length).toBeLessThanOrEqual(before)
      expect(result.remaining.length).toBeLessThanOrEqual(before)
    }
  })

  it("reports exactly what is left", () => {
    for (const config of configs) {
      const result = fixAll(config)
      expect(checkTheme(result.config)).toEqual(result.remaining)
    }
  })

  it("is idempotent", () => {
    for (const config of configs) {
      const once = fixAll(config)
      const twice = fixAll(once.config)
      expect(twice.config).toEqual(once.config)
      expect(twice.remaining).toEqual(once.remaining)
    }
  })

  it("is deterministic", () => {
    for (const config of configs)
      expect(JSON.stringify(fixAll(config))).toBe(
        JSON.stringify(fixAll(config))
      )
  })
})
