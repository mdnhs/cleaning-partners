import { globSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { permissionFor } from "@/lib/admin/nav"
import type { PermissionRequest } from "@/lib/auth/permissions"

/**
 * MK parity B5: every panel page guards with `requirePage(href)`, so the nav
 * registry is the single source of a page's permission and a page missing
 * from the registry 404s instead of rendering unguarded. No exemptions: a
 * section index that only redirects guards too.
 */
const ROOT = "app/(admin)/admin/(panel)"
const pages = globSync(`${ROOT}/**/page.tsx`).sort()

/**
 * The URL a page file serves: route groups dropped, cut at the first
 * dynamic segment (dynamic routes guard with their static parent).
 */
function guardHref(file: string): string {
  const segments = file
    .slice(ROOT.length, -"/page.tsx".length)
    .split("/")
    .filter((s) => s && !/^\(.*\)$/.test(s))
  const dynamic = segments.findIndex((s) => s.startsWith("["))
  const fixed = dynamic === -1 ? segments : segments.slice(0, dynamic)
  return ["/admin", ...fixed].join("/")
}

/**
 * A page's source with comments stripped, so a commented-out check never
 * counts. Whole-line `//` comments go first: a line comment can contain
 * `/*` (settings/[key] says "every /admin/settings/* path"), which would
 * otherwise open a fake block comment and swallow the real guard.
 */
function source(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
}

/**
 * Pages whose action needs more than the registry's read permission for
 * their href: the page must keep its finer check, awaited, next to
 * requirePage (services/new, blog/new). Mutation-checked: commenting out a finer check,
 * calling it without `await`, or `void check() // await check` (a trailing
 * comment), fails "keeps its finer check".
 */
const FINER_CHECKS: Record<string, string> = {
  "services/new/page.tsx": `requirePermission({ service: ["create"] })`,
  "blog/new/page.tsx": `requirePermission({ article: ["create"] })`,
}

/**
 * The permission each page opens with, pinned as literals: the inline checks
 * the pages had before B5 (GROWTH_SETTINGS resolved). The registry is now the
 * single source, so an edit to lib/admin/nav.ts that loosens or tightens a
 * page fails here. Mutation-checked: setting the media entry to page:read
 * fails "media/page.tsx resolves to its pinned permission".
 */
const EXPECTED: Record<string, PermissionRequest | null> = {
  "page.tsx": null,
  "account/page.tsx": null,
  "activity/page.tsx": { audit: ["read"] },
  "appearance/page.tsx": { appearance: ["read"] },
  "help/page.tsx": null,
  "users/page.tsx": { user: ["read"] },
  "users/[id]/page.tsx": { user: ["read"] },
  "pages/page.tsx": { page: ["read"] },
  "pages/[key]/page.tsx": { page: ["read"] },
  "blog/page.tsx": { article: ["read"] },
  "blog/[id]/page.tsx": { article: ["read"] },
  "blog/categories/page.tsx": { collection: ["read"] },
  "blog/new/page.tsx": { article: ["read"] },
  "collections/page.tsx": { collection: ["read"] },
  "collections/clients/page.tsx": { collection: ["read"] },
  "collections/group-companies/page.tsx": { collection: ["read"] },
  "collections/team/page.tsx": { collection: ["read"] },
  "collections/testimonials/page.tsx": { collection: ["read"] },
  "leads/page.tsx": { lead: ["read"] },
  "leads/[id]/page.tsx": { lead: ["read"] },
  "media/page.tsx": { media: ["read"] },
  "services/page.tsx": { service: ["read"] },
  "services/[id]/page.tsx": { service: ["read"] },
  "services/new/page.tsx": { service: ["read"] },
  "settings/page.tsx": { settings: ["read"] },
  "settings/[key]/page.tsx": { settings: ["read"] },
  "settings/integrations/page.tsx": { integration: ["read"] },
  "settings/integrations/[slug]/page.tsx": { integration: ["read"] },
  "marketing/page.tsx": { marketing: ["read"] },
  "marketing/code/page.tsx": { customCode: ["read"] },
  "marketing/consent/page.tsx": { marketing: ["read"] },
  "marketing/events/page.tsx": { marketing: ["read"] },
  "seo/page.tsx": { seo: ["read"] },
  "seo/defaults/page.tsx": { seo: ["read"] },
  "seo/redirects/page.tsx": { redirect: ["read"] },
}

const rel = (file: string) => file.slice(ROOT.length + 1)

describe("panel page guards", () => {
  it("finds the panel pages", () => {
    expect(pages.length).toBeGreaterThan(1)
  })

  it.each(pages)(
    "%s guards with requirePage on its registered href",
    (file) => {
      const src = source(file)
      const calls = [...src.matchAll(/requirePage\(\s*([^)]*)\)/g)]
      expect(calls, "calls requirePage").toHaveLength(1)
      const m = calls[0]![1]!.match(/^"([^"]+)"$/)
      expect(m, "requirePage takes a string literal").not.toBeNull()
      expect(src, "the guard is awaited").toMatch(/await requirePage\("/)
      const href = m![1]!
      expect(href, "the page's own URL (static parent for [params])").toBe(
        guardHref(file)
      )
      expect(permissionFor(href), "href is in the nav registry").not.toBe(
        undefined
      )
    }
  )

  it.each(Object.entries(FINER_CHECKS))(
    "%s keeps its finer check",
    (file, check) => {
      // Only a statement counts: `await check` starting a line, optionally
      // bound (`const actor = await check`). Text after code
      // (`void check() // await check`) or inside a string does not.
      const statement = new RegExp(
        `^\\s*(?:(?:const|let)\\s+\\w+\\s*=\\s*)?await ${check.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "m"
      )
      expect(source(`${ROOT}/${file}`)).toMatch(statement)
    }
  )

  it("pins a permission for every panel page", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(pages.map(rel).sort())
  })

  it.each(pages.map(rel))("%s resolves to its pinned permission", (file) => {
    expect(permissionFor(guardHref(`${ROOT}/${file}`))).toEqual(EXPECTED[file])
  })

  it("maps page files to guard hrefs", () => {
    expect(guardHref(`${ROOT}/page.tsx`)).toBe("/admin")
    expect(guardHref(`${ROOT}/blog/[id]/page.tsx`)).toBe("/admin/blog")
    expect(guardHref(`${ROOT}/settings/integrations/[slug]/page.tsx`)).toBe(
      "/admin/settings/integrations"
    )
    expect(guardHref(`${ROOT}/(group)/media/page.tsx`)).toBe("/admin/media")
  })
})
