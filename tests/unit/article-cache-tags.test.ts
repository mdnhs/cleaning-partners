import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

/**
 * R5-4 (amended): a category write invalidates only `tag.categories`. The
 * articles' public queries show the category name, so every cached article
 * query also carries `tag.categories`. That is why category writes do not
 * need to expire `tag.articles`: dropping that tag from a query here would
 * leave stale category names on /blog after a rename.
 */
const source = readFileSync("server/modules/articles/queries.ts", "utf8")

const cached = [
  ...source.matchAll(
    /export async function (\w+)[\s\S]*?"use cache"[\s\S]*?cacheTag\((.*)\)$/gm
  ),
].map((m) => ({ name: m[1]!, tags: m[2]! }))

describe("cached article queries carry tag.categories", () => {
  it("finds the cached queries", () => {
    expect(cached.map((c) => c.name)).toEqual(["listArticles", "getArticle"])
  })

  it.each(cached)("$name tags tag.categories", ({ tags }) => {
    expect(tags).toContain("tag.categories")
  })

  it("every 'use cache' function was matched", () => {
    expect(source.match(/"use cache"/g)).toHaveLength(cached.length)
  })
})
