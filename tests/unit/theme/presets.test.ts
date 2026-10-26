import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { ADMIN_DEFAULT, buildAdminTokens } from "@/lib/theme/admin"
import { parseColor, sameColor, toHex } from "@/lib/theme/color"
import { PRESET_IDS, PRESETS, CP_SITE } from "@/lib/theme/presets"
import { DEFAULT_THEME } from "@/lib/theme/schema"
import {
  presetSiteTheme,
  resolveSiteTokens,
  SITE_DEFAULT,
} from "@/lib/theme/site"
import {
  ADMIN_TOKEN_NAMES,
  CP_ADMIN_DARK,
  CP_ADMIN_LIGHT,
} from "@/lib/theme/cp-admin"
import { ADMIN_TOKENS, SITE_SURFACES, SITE_TOKENS } from "@/lib/theme/tokens"

const adminCss = readFileSync(
  path.join(import.meta.dirname, "../../../app/(admin)/admin/admin.css"),
  "utf8"
)

/** Custom properties declared in the first `<selector> {` block. */
function cssDeclarations(source: string, selector: string) {
  const start = source.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`no "${selector} {" block`)
  const body = source.slice(start, source.indexOf("}", start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value!.trim().toLowerCase(),
    ])
  )
}

const globals = readFileSync(
  path.join(import.meta.dirname, "../../../app/globals.css"),
  "utf8"
)

describe("base tables", () => {
  it("CP_SITE equals app/globals.css @theme tokens (ruling 4)", () => {
    for (const t of SITE_TOKENS)
      expect(globals).toContain(`--color-${t}: ${CP_SITE[t]};`)
    expect(Object.keys(CP_SITE).sort()).toEqual([...SITE_TOKENS].sort())
  })

  it("CP_ADMIN parses into ADMIN_DEFAULT unchanged", () => {
    for (const t of ADMIN_TOKENS) {
      expect(toHex(ADMIN_DEFAULT.light[t]), t).toBe(CP_ADMIN_LIGHT[t])
      expect(toHex(ADMIN_DEFAULT.dark[t]), t).toBe(
        CP_ADMIN_DARK[t] ?? CP_ADMIN_LIGHT[t]
      )
    }
  })

  it("ADMIN_TOKENS is the one A1 list", () => {
    expect(ADMIN_TOKENS).toBe(ADMIN_TOKEN_NAMES)
    expect(ADMIN_TOKENS).toHaveLength(48)
  })

  it("SITE_SURFACES are the page backgrounds", () => {
    expect([...SITE_SURFACES].sort()).toEqual(
      ["sky-soft", "brand-soft", "surface"].sort()
    )
  })

  it("resolveSiteTokens(DEFAULT_THEME.site) is the hex in globals.css", () => {
    const tokens = resolveSiteTokens(DEFAULT_THEME.site)
    for (const t of SITE_TOKENS) {
      const m = globals.match(new RegExp(`--color-${t}:\\s*(#[0-9a-fA-F]{6});`))
      expect(m, t).not.toBeNull()
      expect(toHex(tokens[t]), t).toBe(m![1]!.toLowerCase())
    }
  })

  it("buildAdminTokens(DEFAULT_THEME.admin, mode) is the hex in admin.css", () => {
    const light = cssDeclarations(adminCss, "html[data-admin]")
    const dark = {
      ...light,
      ...cssDeclarations(adminCss, "html[data-admin].dark"),
    }
    for (const [mode, decl] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      const tokens = buildAdminTokens(DEFAULT_THEME.admin, mode)
      for (const t of ADMIN_TOKENS)
        expect(toHex(tokens[t]), `${mode} ${t}`).toBe(decl[t])
    }
  })

  it("SITE_DEFAULT is CP_SITE", () => {
    for (const t of SITE_TOKENS)
      expect(toHex(SITE_DEFAULT[t]), t).toBe(CP_SITE[t])
  })
})

describe("presets", () => {
  it("lists the six presets with Cleaning Partners first", () => {
    expect(PRESET_IDS).toEqual([
      "cleaning-partners",
      "evergreen",
      "ocean",
      "plum",
      "terracotta",
      "graphite",
    ])
    expect(PRESETS["cleaning-partners"].site.brand).toBe("#11b1d1")
    expect(PRESETS["cleaning-partners"].admin.primary).toBe("#0a778d")
    expect(DEFAULT_THEME.site.preset).toBe("cleaning-partners")
    expect(DEFAULT_THEME.admin.preset).toBe("cleaning-partners")
  })

  it("a site preset moves only the brand family", () => {
    for (const id of PRESET_IDS) {
      const tokens = resolveSiteTokens(presetSiteTheme(id))
      for (const t of SITE_TOKENS) {
        const brandFamily = ["brand", "brand-deep", "brand-soft"].includes(t)
        if (!brandFamily)
          expect(sameColor(tokens[t], SITE_DEFAULT[t]), `${id} ${t}`).toBe(true)
      }
      expect(toHex(tokens.brand)).toBe(
        toHex(parseColor(PRESETS[id].site.brand)!)
      )
    }
  })

  it("locked site tokens win over the derived ones", () => {
    const tokens = resolveSiteTokens({
      ...DEFAULT_THEME.site,
      brand: "oklch(0.47 0.09 250)",
      tokens: { "navy-dark": "oklch(0.2 0.05 260)" },
    })
    expect(tokens["navy-dark"]).toEqual({ l: 0.2, c: 0.05, h: 260 })
  })
})

describe("shared tables are never handed out", () => {
  it("defaults, presets and the default theme are frozen all the way down", () => {
    for (const shared of [
      ADMIN_DEFAULT.light.primary,
      ADMIN_DEFAULT.dark.foreground,
      SITE_DEFAULT.brand,
      SITE_DEFAULT,
      PRESETS.ocean.site,
      CP_SITE,
      DEFAULT_THEME.site.tokens,
      DEFAULT_THEME.admin,
    ])
      expect(Object.isFrozen(shared)).toBe(true)
    expect(() => {
      ;(SITE_DEFAULT.brand as { l: number }).l = 0.1
    }).toThrow(TypeError)
  })

  it("resolved tokens are fresh objects a caller may edit", () => {
    for (const id of PRESET_IDS) {
      const site = resolveSiteTokens(presetSiteTheme(id))
      const admin = buildAdminTokens(
        { ...DEFAULT_THEME.admin, preset: id, accent: "#3366cc" },
        "dark"
      )
      for (const t of SITE_TOKENS) {
        expect(Object.isFrozen(site[t])).toBe(false)
        site[t].l = 0.5
      }
      for (const t of ADMIN_TOKENS) {
        expect(Object.isFrozen(admin[t])).toBe(false)
        admin[t].l = 0.5
      }
      // One token never aliases another.
      expect(admin.accent).not.toBe(admin["sidebar-accent"])
    }
    expect(toHex(resolveSiteTokens(DEFAULT_THEME.site).brand)).toBe("#11b1d1")
    expect(buildAdminTokens(DEFAULT_THEME.admin, "dark").foreground).toEqual(
      ADMIN_DEFAULT.dark.foreground
    )
    expect(SITE_DEFAULT.brand.l).not.toBe(0.5)
  })
})
