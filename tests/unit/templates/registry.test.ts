import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  pageKeyParam,
  PAGE_KEYS as API_PAGE_KEYS,
} from "@/lib/schemas/api/content"
import { templateEditorMeta } from "@/templates/editor-meta"
import {
  isPageKey,
  PAGE_KEYS,
  PAGE_PATHS,
  PAGES,
  templateSchemaFor,
  templates,
} from "@/templates/registry"

import { schemaPaths } from "../helpers/schema-paths"

describe("template registry (R3-2)", () => {
  it("has six templates and no team", () => {
    expect(Object.keys(templates)).toEqual([
      "home",
      "about",
      "services",
      "blog",
      "contact",
      "legal",
    ])
    expect(Object.keys(PAGES)).not.toContain("team")
  })

  it("maps privacy and terms to the legal template", () => {
    expect(PAGES.privacy).toBe("legal")
    expect(PAGES.terms).toBe("legal")
    expect(templateSchemaFor("terms")).toBe(templates.legal.schema)
  })

  it("serves the seven public paths", () => {
    expect(PAGE_PATHS).toEqual({
      home: "/",
      about: "/about",
      services: "/services",
      blog: "/blog",
      contact: "/contact",
      privacy: "/privacy",
      terms: "/terms",
    })
  })

  it("isPageKey accepts only registry keys", () => {
    for (const key of PAGE_KEYS) expect(isPageKey(key)).toBe(true)
    expect(isPageKey("team")).toBe(false)
    expect(isPageKey("toString")).toBe(false)
  })

  it("lib/schemas/api/content re-exports the registry's seven keys", () => {
    expect(API_PAGE_KEYS).toBe(PAGE_KEYS)
    expect([...API_PAGE_KEYS]).toEqual([
      "home",
      "about",
      "services",
      "blog",
      "contact",
      "privacy",
      "terms",
    ])
    expect(pageKeyParam.safeParse({ key: "terms" }).success).toBe(true)
    expect(pageKeyParam.safeParse({ key: "team" }).success).toBe(false)
    const source = readFileSync("lib/schemas/api/content.ts", "utf8")
    expect(source).not.toMatch(/const PAGE_KEYS/)
  })

  it("admin.css keeps the templates out of the admin's Tailwind scan", () => {
    const css = readFileSync("app/(admin)/admin/admin.css", "utf8")
    expect(css).toContain('@source not "../../../templates";')
  })
})

describe("template editor meta", () => {
  it("has an entry for every template", () => {
    expect(Object.keys(templateEditorMeta).sort()).toEqual(
      Object.keys(templates).sort()
    )
  })

  it.each(Object.keys(templates) as (keyof typeof templates)[])(
    "%s: every meta key and group names a real schema path",
    (name) => {
      const meta = templateEditorMeta[name]
      const paths = schemaPaths(templates[name].schema)
      // Object paths are the prefixes of the leaf and list paths.
      const known = new Set<string>()
      for (const p of [...paths.leaves, ...paths.lists]) {
        const parts = p.split(".")
        for (let i = 1; i <= parts.length; i++)
          known.add(parts.slice(0, i).join("."))
      }
      for (const p of [...paths.leaves, ...paths.lists]) known.add(p)
      expect(Object.keys(meta.fields).filter((key) => !known.has(key))).toEqual(
        []
      )
      expect(
        Object.keys(meta.groups ?? {}).filter((key) => !known.has(key))
      ).toEqual([])
    }
  )
})
