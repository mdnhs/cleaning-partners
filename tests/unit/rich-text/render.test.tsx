import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { WithMedia } from "@/lib/media"
import { ArticleBlocks } from "@/lib/rich-text/render"
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

import * as frozen from "./frozen-markup"

/** Test docs have no unresolved images, so the stored shape is already the resolved one. */
const resolved = (...blocks: RichTextBlock[]) =>
  doc(...blocks) as WithMedia<RichTextDoc>

const render = (...blocks: RichTextBlock[]) =>
  renderToStaticMarkup(
    <ArticleBlocks doc={resolved(...blocks)} checkIcon={CHECK_ICON} />
  )

const CHECK_ICON = "/images/services/check.svg"

const text = (t: string) => [{ type: "text" as const, text: t }]
const item = (t: string) => ({
  type: "listItem" as const,
  content: [{ type: "paragraph" as const, content: text(t) }],
})

describe("ArticleBlocks reproduces the frozen ArticleBody markup", () => {
  it("lead", () => expect(render(lead("Opening."))).toBe(frozen.LEAD))
  it("h2", () => expect(render(heading2("A heading"))).toBe(frozen.H2))
  it("p", () => expect(render(paragraph("Body copy."))).toBe(frozen.P))
  it("quote", () =>
    expect(render(quote("Said it.", "The Clean Team"))).toBe(frozen.QUOTE))
  it("checklist", () =>
    expect(render(checklist("One", "Two"))).toBe(frozen.CHECKLIST))

  it("whole 5-signs body", () => {
    const articles = articlesFixture((path) => ({
      mediaId: path,
      url: path,
    })) as unknown as { slug: string; content: { body: unknown } }[]
    const article = articles.find((a) => a.slug.startsWith("5-signs"))!
    const html = renderToStaticMarkup(
      <ArticleBlocks
        doc={article.content.body as WithMedia<RichTextDoc>}
        checkIcon={CHECK_ICON}
      />
    )
    expect(html).toBe(frozen.WHOLE)
  })
})

describe("ArticleBlocks frozen contract for nodes without a baseline block", () => {
  it("h3", () =>
    expect(
      render({ type: "heading", attrs: { level: 3 }, content: text("Sub") })
    ).toBe(frozen.H3))
  it("orderedList with start", () =>
    expect(
      render({
        type: "orderedList",
        attrs: { start: 3 },
        content: [item("a"), item("b")],
      })
    ).toBe(frozen.OL))
  it("plain bulletList", () => {
    expect(render(bulletList("a", "b"))).toBe(frozen.UL)
  })
  it("image with resolved media", () => {
    const html = renderToStaticMarkup(
      <ArticleBlocks
        doc={
          {
            type: "doc",
            content: [
              {
                type: "image",
                attrs: { media: { url: "/images/x.png" }, alt: "Alt text" },
              },
            ],
          } as unknown as WithMedia<RichTextDoc>
        }
        checkIcon={CHECK_ICON}
      />
    )
    expect(html).toBe(frozen.IMAGE)
  })
})

describe("ArticleBlocks other behaviour", () => {
  it("renders marks, a safe link and the unsafe-href fallback", () => {
    const html = render({
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
    })
    expect(html).toBe(frozen.LINKS)
  })

  it("renders nothing for unknown nodes and drops trailing empty paragraphs", () => {
    const unknown = { type: "mystery" } as unknown as RichTextBlock
    expect(render(unknown)).toBe("")
    expect(render(paragraph("x"), { type: "paragraph" })).toBe(
      render(paragraph("x"))
    )
  })
})
