import { describe, expect, it } from "vitest"

import { permissionFor } from "@/lib/admin/nav"
import {
  articleLinks,
  articleTexts,
  canFollow,
  groupedArticles,
  HELP_ARTICLES,
  HELP_GROUPS,
  HELP_HREF,
  headingId,
  helpArticle,
  neighbours,
  searchHelp,
  tocFor,
  visibleArticles,
} from "@/lib/admin/help/registry"
import { ROLES } from "@/lib/auth/roles"

const slugs = (articles: readonly { slug: string }[]) =>
  articles.map((article) => article.slug)

describe("help registry (Cleaning Partners admin)", () => {
  it("has unique slugs and every article in a known group", () => {
    const all = slugs(HELP_ARTICLES)
    expect(new Set(all).size).toBe(all.length)
    const groups = new Set(HELP_GROUPS.map((group) => group.id))
    for (const article of HELP_ARTICLES) expect(groups).toContain(article.group)
  })

  it("has at least one article in every group", () => {
    for (const group of HELP_GROUPS)
      expect(
        HELP_ARTICLES.filter((article) => article.group === group.id),
        group.id
      ).not.toHaveLength(0)
  })

  it("has the getting-started article the Help home links to", () => {
    expect(helpArticle("getting-started")?.group).toBe("start")
  })

  it("gives every article text, sections and unique section anchors", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.lead.length, article.slug).toBeGreaterThan(20)
      expect(article.sections.length, article.slug).toBeGreaterThan(0)
      const ids = tocFor(article).map((entry) => entry.id)
      expect(new Set(ids).size, article.slug).toBe(ids.length)
      for (const section of article.sections)
        expect(
          section.blocks.length,
          `${article.slug}/${section.title}`
        ).toBeGreaterThan(0)
    }
  })

  it("only links to real help articles and admin screens", () => {
    for (const article of HELP_ARTICLES)
      for (const href of articleLinks(article)) {
        const path = href.split("#")[0]!
        if (path === HELP_HREF) continue
        if (path.startsWith(`${HELP_HREF}/`)) {
          expect(
            helpArticle(path.slice(HELP_HREF.length + 1)),
            `${article.slug} -> ${href}`
          ).toBeDefined()
        } else {
          expect(
            permissionFor(path),
            `${article.slug} -> ${href} is not an admin screen`
          ).not.toBeUndefined()
        }
      }
  })

  it("never mentions the removed or foreign admin pieces", () => {
    // Built from pieces so this file does not trip the branding gate itself.
    const banned = new RegExp(
      [
        "security" + " partners",
        "magda",
        "in" + "sights",
        "enquire banner",
        "copy to new page",
        "shared on this page",
      ].join("|"),
      "i"
    )
    for (const article of HELP_ARTICLES)
      expect(
        [article.title, article.lead, ...articleTexts(article)].join("\n"),
        article.slug
      ).not.toMatch(banned)
  })

  it("lists fewer articles to a role that opens fewer screens", () => {
    const viewer = slugs(visibleArticles(["viewer"]))
    const owner = slugs(visibleArticles(["owner"]))
    expect(owner).toEqual(slugs(HELP_ARTICLES))
    expect(viewer).not.toContain("enquiries")
    expect(viewer).not.toContain("users-and-roles")
    expect(viewer).toContain("website-overview")
    const intake = slugs(visibleArticles(["intake"]))
    expect(intake).toEqual(expect.arrayContaining(["enquiries", "live-chat"]))
    expect(intake).not.toContain("services")
    for (const role of ROLES)
      expect(slugs(visibleArticles([role]))).toContain("getting-started")
  })

  it("groups only what a role can read and drops empty groups", () => {
    for (const group of groupedArticles(["intake"])) {
      expect(group.articles.length).toBeGreaterThan(0)
    }
    const ids = groupedArticles(["owner"]).map((group) => group.id)
    expect(ids).toEqual(HELP_GROUPS.map((group) => group.id))
  })

  it("walks neighbours in sidebar order among the visible", () => {
    const order = slugs(visibleArticles(["owner"]))
    const { prev, next } = neighbours(["owner"], order[1]!)
    expect(prev?.slug).toBe(order[0])
    expect(next?.slug).toBe(order[2])
    expect(neighbours(["owner"], order[0]!).prev).toBeUndefined()
    expect(neighbours(["owner"], "no-such").next).toBeUndefined()
  })

  it("only follows links a role may open", () => {
    expect(canFollow(["viewer"], "/admin/leads")).toBe(false)
    expect(canFollow(["intake"], "/admin/leads")).toBe(true)
    expect(canFollow(["viewer"], "/admin/help/getting-started")).toBe(true)
    expect(canFollow(["viewer"], "/admin/help/enquiries")).toBe(false)
    expect(canFollow(["owner"], "/admin/nowhere")).toBe(false)
  })

  it("finds articles by title, description or keyword only", () => {
    expect(slugs(searchHelp(["owner"], "services"))).toContain("services")
    expect(slugs(searchHelp(["owner"], "redirect"))).toContain("seo")
    expect(searchHelp(["owner"], "")).toEqual([])
    expect(searchHelp(["owner"], "zzzz-no-match")).toEqual([])
  })

  it("makes tidy heading ids", () => {
    expect(headingId("Saving vs publishing")).toBe("saving-vs-publishing")
    expect(headingId("Show & hide")).toBe("show-and-hide")
  })
})
