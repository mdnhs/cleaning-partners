import { Editor } from "@tiptap/core"
import { afterEach, describe, expect, it } from "vitest"

import {
  normalizeRichTextDoc,
  richTextExtensions,
} from "@/components/admin/rich-text/extensions"
import { paragraphsText, richText } from "@/lib/schemas/common"

let editors: Editor[] = []
afterEach(() => {
  for (const e of editors) e.destroy()
  editors = []
})

function load(content: string | object, mode: "full" | "paragraphs" = "full") {
  const editor = new Editor({
    extensions: richTextExtensions(mode),
    content,
  })
  editors.push(editor)
  return editor
}

/** What the admin editor saves: getJSON() through the same normaliser as onUpdate. */
function parse(html: string, mode: "full" | "paragraphs" = "full") {
  return normalizeRichTextDoc(load(html, mode).getJSON())
}

const types = (node: { type?: string; content?: unknown[] }): string[] => [
  node.type ?? "",
  ...((node.content ?? []) as { type?: string; content?: unknown[] }[]).flatMap(
    types
  ),
]

describe("rich text editor schema = stored schema (spec §5.3)", () => {
  it("keeps every allowed node and mark, and the result validates", () => {
    const doc = parse(
      [
        "<h2>Title</h2><h3>Sub</h3>",
        '<p>Plain <strong>bold</strong> <em>italic</em> <a href="/contact">link</a><br>next</p>',
        '<ul><li><p>one</p></li></ul><ol start="3"><li><p>two</p></li></ol>',
        '<blockquote cite="Michael"><p>Quote</p></blockquote>',
        '<img data-media-id="00000000-0000-7000-8000-000000000001" alt="Hero">',
      ].join("")
    )
    expect(new Set(types(doc))).toEqual(
      new Set([
        "doc",
        "heading",
        "paragraph",
        "text",
        "hardBreak",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "image",
      ])
    )
    const parsed = richText.safeParse(doc)
    expect(parsed.success).toBe(true)
    const blocks = parsed.data!.content
    expect(blocks.find((b) => b.type === "blockquote")).toMatchObject({
      attrs: { cite: "Michael" },
    })
    expect(blocks.find((b) => b.type === "image")).toEqual({
      type: "image",
      attrs: {
        media: { mediaId: "00000000-0000-7000-8000-000000000001" },
        alt: "Hero",
      },
    })
  })

  it("strips what the site cannot render when pasted", () => {
    const doc = parse(
      [
        "<h1>Big</h1><h4>Small</h4>",
        "<pre><code>code()</code></pre><hr><p><s>strike</s> <u>under</u> <code>x</code></p>",
        "<table><tr><td>cell</td></tr></table>",
        '<img src="https://evil.example/x.png">',
        '<p><a href="javascript:alert(1)">bad</a></p>',
        "<ul><li><p>a</p><ul><li><p>nested</p></li></ul></li></ul>",
        "<blockquote><h2>no headings in quotes</h2></blockquote>",
      ].join("")
    )
    const all = types(doc)
    for (const banned of ["codeBlock", "horizontalRule", "table", "code"])
      expect(all).not.toContain(banned)
    expect(JSON.stringify(doc)).not.toContain("javascript:")
    expect(JSON.stringify(doc)).not.toContain("evil.example")
    expect(JSON.stringify(doc)).not.toMatch(/"type":"(strike|underline)"/)
    expect(richText.safeParse(doc).success).toBe(true)
  })

  it("paragraphs mode keeps only paragraphs (with bold, italic, links)", () => {
    const doc = parse(
      '<h2>Heading</h2><p><strong>B</strong> <a href="https://example.com">l</a></p><ul><li><p>item</p></li></ul>',
      "paragraphs"
    )
    expect(new Set(types(doc))).toEqual(new Set(["doc", "paragraph", "text"]))
    expect(paragraphsText.safeParse(doc).success).toBe(true)
  })

  it("emits exactly the stored shape (no editor-only attributes)", () => {
    const html =
      '<h2>T</h2><p><a href="https://example.com">l</a></p><ol start="2"><li><p>x</p></li></ol><blockquote><p>q</p></blockquote><img data-media-id="00000000-0000-7000-8000-000000000001" alt="A">'
    const doc = parse(html)
    // The stored schema strips unknown attrs; an editor doc must already be
    // in that shape, or reloading a saved draft would look like an edit.
    expect(richText.parse(doc)).toEqual(doc)
    expect(doc.content![1].content![0].marks).toEqual([
      { type: "link", attrs: { href: "https://example.com" } },
    ])
  })

  it("drops links the site would not render as written", () => {
    const doc = parse(
      [
        '<p><a href="{phone24hHref}">placeholder</a></p>',
        '<p><a href="//evil.example">protocol relative</a></p>',
        '<p><a href="data:text/html,x">data</a></p>',
        '<p><a href="mailto:info@example.com">mail</a> <a href="tel:+353">tel</a> <a href="#top">top</a></p>',
      ].join("")
    )
    const hrefs = JSON.stringify(doc).match(/"href":"[^"]*"/g)
    expect(hrefs).toEqual([
      '"href":"mailto:info@example.com"',
      '"href":"tel:+353"',
      '"href":"#top"',
    ])
  })

  it("keeps only library images whose id is a uuid", () => {
    const doc = parse(
      [
        '<img data-media-id="not-a-uuid" alt="Bad">',
        '<img data-media-id="" alt="Empty">',
        '<img data-media-id="00000000-0000-7000-8000-000000000001" alt="Good">',
      ].join("")
    )
    const images = doc.content!.filter((n) => n.type === "image")
    expect(images.map((n) => n.attrs!.alt)).toEqual(["Good"])
    expect(richText.safeParse(doc).success).toBe(true)
  })

  it("starts pasted ordered lists at 1 or more", () => {
    for (const [start, expected] of [
      ["0", 1],
      ["-4", 1],
      ["2.5", 1],
      ["junk", 1],
      ["7", 7],
    ] as const) {
      const doc = parse(`<ol start="${start}"><li><p>x</p></li></ol>`)
      expect(doc.content![0].attrs).toEqual({ start: expected })
      expect(richText.safeParse(doc).success).toBe(true)
    }
  })

  it('typing "0. " starts a list at 1; "3. " keeps 3', () => {
    for (const [typed, start] of [
      ["0.", 1],
      ["3.", 3],
    ] as const) {
      const editor = new Editor({
        extensions: richTextExtensions("full"),
        content: "<p></p>",
      })
      editors.push(editor)
      editor.commands.insertContent(typed)
      const { view } = editor
      const { from, to } = view.state.selection
      const handled = view.someProp("handleTextInput", (f) =>
        f(view, from, to, " ", () => view.state.tr.insertText(" ", from, to))
      )
      expect(handled).toBe(true)
      const doc = normalizeRichTextDoc(editor.getJSON())
      expect(doc.content![0]).toMatchObject({
        type: "orderedList",
        attrs: { start },
      })
      expect(richText.safeParse(doc).success).toBe(true)
    }
  })
})

describe("variants: paragraph lead and bulletList checklist (R4-2)", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { variant: "lead" },
        content: [{ type: "text", text: "Opening." }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Body." }] },
      {
        type: "bulletList",
        attrs: { variant: "checklist" },
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "One" }] },
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Plain" }] },
            ],
          },
        ],
      },
    ],
  }

  it("keeps lead and checklist on load and save, and validates", () => {
    const saved = normalizeRichTextDoc(load(doc).getJSON())
    expect(saved).toEqual(doc)
    expect(richText.parse(saved)).toEqual(doc)
  })

  it("writes a null variant out of getJSON, and normalising removes it", () => {
    const raw = load(doc).getJSON()
    expect(raw.content![1].attrs).toEqual({ variant: null })
    expect(normalizeRichTextDoc(raw).content![1]).not.toHaveProperty("attrs")
    expect(normalizeRichTextDoc(raw).content![3]).not.toHaveProperty("attrs")
  })

  it("round-trips through HTML (paste/drag) with data-variant", () => {
    const html = load(doc).getHTML()
    expect(html).toContain('<p data-variant="lead">Opening.</p>')
    expect(html).toContain('<ul data-variant="checklist">')
    expect(normalizeRichTextDoc(load(html).getJSON())).toEqual(doc)
  })

  it("paragraphs mode strips variants (paragraphsText allows none)", () => {
    const loaded = load(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { variant: "lead" },
            content: [{ type: "text", text: "Opening." }],
          },
        ],
      },
      "paragraphs"
    )
    const saved = normalizeRichTextDoc(loaded.getJSON())
    expect(JSON.stringify(saved)).not.toContain("variant")
    expect(saved.content![0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Opening." }],
    })
    expect(paragraphsText.safeParse(saved).success).toBe(true)
  })
})
