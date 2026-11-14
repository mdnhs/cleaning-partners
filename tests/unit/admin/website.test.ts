import { describe, expect, it } from "vitest"

import { PAGE_LABELS } from "@/lib/admin/page-labels"
import { EDITABLE_SETTINGS_KEYS } from "@/lib/admin/settings-keys"
import {
  adminHrefForCollection,
  adminHrefForSettings,
  backLinkForBuilderPage,
  isWebsiteKey,
  isWebsiteSettingsKey,
  PAGE_SHOWS,
  partHref,
  SITE_SETTINGS_KEYS,
  sharedOnPage,
  WEBSITE_PARTS,
  WEBSITE_SCREENS,
  websiteHref,
  websitePart,
  websiteTabs,
  withSearch,
} from "@/lib/admin/website"
import { COLLECTIONS } from "@/lib/schemas/api/collections"
import { PAGE_KEYS, type PageKey } from "@/templates/registry"

describe("website registry", () => {
  it("lists one page screen per PAGE_KEYS page, in order, then custom-pages, legal, header-footer", () => {
    expect(WEBSITE_SCREENS.map((s) => s.key)).toEqual([
      ...PAGE_KEYS,
      "custom-pages",
      "legal",
      "header-footer",
    ])
    for (const key of PAGE_KEYS) {
      const screen = WEBSITE_SCREENS.find((s) => s.key === key)!
      expect(screen.label).toBe(PAGE_LABELS[key])
      expect(screen.page).toBe(key)
    }
    expect(isWebsiteKey("header-footer")).toBe(true)
    expect(isWebsiteKey("nope")).toBe(false)
    expect(isWebsiteKey("toString")).toBe(false)
  })

  it("places every editable settings key exactly once", () => {
    for (const key of EDITABLE_SETTINGS_KEYS)
      expect(
        isWebsiteSettingsKey(key),
        `${key}: place it as a Website part or in SITE_SETTINGS_KEYS`
      ).not.toBe((SITE_SETTINGS_KEYS as readonly string[]).includes(key))
    const settingsKeys = WEBSITE_PARTS.flatMap((p) =>
      p.source.kind === "settings" ? [p.source.key] : []
    )
    expect(new Set(settingsKeys).size).toBe(settingsKeys.length)
  })

  it("homes every collection", () => {
    for (const name of COLLECTIONS) {
      const href = adminHrefForCollection(name)
      expect(
        href.startsWith("/admin/website/") || href === "/admin/blog/categories",
        `${name} → ${href}`
      ).toBe(true)
    }
    expect(adminHrefForCollection("categories")).toBe("/admin/blog/categories")
  })

  it("part ids are unique and every PAGE_SHOWS id is a part", () => {
    const ids = WEBSITE_PARTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const page of PAGE_KEYS)
      for (const id of PAGE_SHOWS[page]) expect(ids).toContain(id)
  })

  it("a page-screen part is listed in its own page's PAGE_SHOWS", () => {
    for (const part of WEBSITE_PARTS) {
      const screen = WEBSITE_SCREENS.find((s) => s.key === part.screen)!
      if (screen.page) expect(PAGE_SHOWS[screen.page]).toContain(part.id)
    }
  })

  it("hrefs", () => {
    expect(websiteHref("home")).toBe("/admin/website/home")
    expect(partHref(websitePart("home", "testimonials")!)).toBe(
      "/admin/website/home/testimonials"
    )
    expect(partHref(websitePart("services", "all-services")!)).toBe(
      "/admin/services"
    )
    expect(websitePart("home", "footer")).toBeUndefined()
    expect(adminHrefForSettings("footer")).toBe(
      "/admin/website/header-footer/footer"
    )
    expect(adminHrefForSettings("site")).toBe("/admin/settings/site")
  })

  it("websiteTabs by role", () => {
    const ids = (screen: Parameters<typeof websiteTabs>[0], role: string) =>
      websiteTabs(screen, [role]).map((t) => t.id)
    expect(ids("home", "owner")).toEqual([
      "page",
      "clients-section",
      "clients",
      "why-choose-us",
      "testimonials-section",
      "testimonials",
    ])
    expect(ids("blog", "author")).toEqual(["articles"])
    expect(ids("home", "marketer")).toEqual(["page"])
    expect(ids("home", "intake")).toEqual([])
    expect(websiteTabs("home", ["owner"])[0]).toEqual({
      id: "page",
      label: "Page",
      href: "/admin/website/home",
    })
    expect(websiteTabs("blog", ["author"])[0].href).toBe("/admin/blog")
  })

  it("sharedOnPage lists parts homed elsewhere", () => {
    const shared = sharedOnPage("about", ["owner"])
    expect(shared).toContainEqual({
      id: "testimonials",
      label: "Testimonials",
      href: "/admin/website/home/testimonials",
      screenLabel: "Home",
    })
    expect(shared.map((s) => s.id)).not.toContain("team")
    expect(sharedOnPage("about" as PageKey, ["intake"])).toEqual([])
  })

  it("backLinkForBuilderPage", () => {
    expect(backLinkForBuilderPage({ legalOrder: null })).toEqual({
      href: "/admin/website/custom-pages",
      label: "Custom pages",
    })
    expect(backLinkForBuilderPage({ legalOrder: 2 })).toEqual({
      href: "/admin/website/legal",
      label: "Legal pages",
    })
  })

  it("withSearch keeps the query", () => {
    expect(
      withSearch("/a", { edit: "x", tag: ["1", "2"], none: undefined })
    ).toBe("/a?edit=x&tag=1&tag=2")
    expect(withSearch("/a", {})).toBe("/a")
  })
})
