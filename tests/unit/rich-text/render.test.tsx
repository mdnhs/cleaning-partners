import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ArticleBody } from "@/components/blog/article"
import type { BlogPost } from "@/lib/blog-posts"
import { ArticleBlocks } from "@/lib/rich-text/render"
import type { WithMedia } from "@/lib/media"
import type { RichTextBlock, RichTextDoc } from "@/lib/schemas/common"
import { articlesFixture } from "@/server/db/seed/fixtures/articles"
import {
  bulletList,
  checklist,
  doc,
  heading2,
  lead,
  paragraph,
  quote,
} from "@/server/db/seed/fixtures/rich-text"

import { frozenModule } from "../helpers/frozen"

type Frozen = { blogPosts: BlogPost[] }
const baseline = frozenModule<Frozen>("lib/blog-posts.ts").blogPosts

const ARTICLE_OPEN = '<article class="flex flex-col gap-5">'
const ARTICLE_RULE = '<div class="h-px w-full bg-line"></div>'

/** The body blocks of the baseline ArticleBody (the markup between the article tag and its rule). */
function baselineBody(body: NonNullable<BlogPost["body"]>): string {
  const post = { ...baseline[0], body } as BlogPost
  const html = renderToStaticMarkup(<ArticleBody post={post} />)
  const start = html.indexOf(ARTICLE_OPEN) + ARTICLE_OPEN.length
  return html.slice(start, html.indexOf(ARTICLE_RULE))
}

/** Test docs have no images, so the stored shape is already the resolved one. */
const resolved = (...blocks: RichTextBlock[]) =>
  doc(...blocks) as WithMedia<RichTextDoc>

const render = (...blocks: RichTextBlock[]) =>
  renderToStaticMarkup(<ArticleBlocks doc={resolved(...blocks)} />)

describe("ArticleBlocks matches today's ArticleBody per block", () => {
  it("lead", () => {
    expect(render(lead("Opening."))).toBe(
      baselineBody([{ type: "lead", text: "Opening." }])
    )
  })
  it("h2", () => {
    expect(render(heading2("A heading"))).toBe(
      baselineBody([{ type: "h2", text: "A heading" }])
    )
  })
  it("p", () => {
    expect(render(paragraph("Body copy."))).toBe(
      baselineBody([{ type: "p", text: "Body copy." }])
    )
  })
  it("quote", () => {
    expect(render(quote("Said it.", "The Clean Team"))).toBe(
      baselineBody([
        { type: "quote", text: "Said it.", cite: "The Clean Team" },
      ])
    )
  })
  it("checklist", () => {
    expect(render(checklist("One", "Two"))).toBe(
      baselineBody([{ type: "checklist", items: ["One", "Two"] }])
    )
  })
})

describe("ArticleBlocks other behaviour", () => {
  it("whole 5-signs body equals the baseline body", () => {
    const fixture = articlesFixture((path) => ({
      mediaId: path,
      url: path,
    })) as unknown as { slug: string; content: { body: never } }[]
    const article = fixture.find((a) => a.slug.startsWith("5-signs"))!
    const post = baseline.find((p) => p.slug === article.slug)!
    const html = renderToStaticMarkup(
      <ArticleBlocks doc={article.content.body as WithMedia<RichTextDoc>} />
    )
    expect(html).toBe(baselineBody(post.body!))
    expect(html.length).toBeGreaterThan(1000)
  })

  it("renders marks and safe links; unsafe href falls back", () => {
    const html = renderToStaticMarkup(
      <ArticleBlocks
        doc={resolved({
          type: "paragraph",
          content: [
            { type: "text", text: "a", marks: [{ type: "bold" }] },
            { type: "text", text: "b", marks: [{ type: "italic" }] },
            {
              type: "text",
              text: "c",
              marks: [{ type: "link", attrs: { href: "/contact" } }],
            },
            {
              type: "text",
              text: "d",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        })}
      />
    )
    expect(html).toContain("<strong>a</strong>")
    expect(html).toContain("<em>b</em>")
    expect(html).toContain('href="/contact"')
    expect(html).toContain('href="#"')
    expect(html).not.toContain("javascript:")
  })

  it("renders nothing for unknown nodes and drops trailing empty paragraphs", () => {
    const unknown = { type: "mystery" } as unknown as RichTextBlock
    expect(render(unknown)).toBe("")
    expect(render(paragraph("x"), { type: "paragraph" })).toBe(
      render(paragraph("x"))
    )
  })

  it("plain bullet list is not a checklist", () => {
    const html = render(bulletList("x"))
    expect(html).not.toContain("check.svg")
    expect(html).toContain("<li>x</li>")
  })
})
