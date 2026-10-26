import { describe, expect, it } from "vitest"

import { paragraphsText, richText } from "@/lib/schemas/common"

const lead = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { variant: "lead" },
      content: [{ type: "text", text: "Opening." }],
    },
    { type: "paragraph", content: [{ type: "text", text: "Body." }] },
  ],
}

describe("R5-3: paragraphsText is variant-free on the server", () => {
  it("strips a paragraph variant instead of storing it", () => {
    const parsed = paragraphsText.parse(lead)
    expect(parsed.content[0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Opening." }],
    })
    expect(JSON.stringify(parsed)).not.toContain("variant")
  })

  it("keeps plain paragraphs and marks unchanged", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi ", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
          ],
        },
      ],
    }
    expect(paragraphsText.parse(doc)).toEqual(doc)
  })

  it("articles' richText still accepts both variants", () => {
    const doc = {
      type: "doc",
      content: [
        lead.content[0],
        {
          type: "bulletList",
          attrs: { variant: "checklist" },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "x" }] },
              ],
            },
          ],
        },
      ],
    }
    expect(richText.parse(doc)).toEqual(doc)
  })
})

describe("M1: richText nested paragraphs are variant-free", () => {
  const leadPara = {
    type: "paragraph",
    attrs: { variant: "lead" },
    content: [{ type: "text", text: "Nested." }],
  }
  const plain = { type: "paragraph", content: [{ type: "text", text: "Nested." }] }

  it("strips a lead variant inside a list item", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [leadPara] }],
        },
      ],
    }
    const parsed = richText.parse(doc)
    expect(JSON.stringify(parsed)).not.toContain("variant")
    expect(parsed.content[0]).toMatchObject({
      content: [{ content: [plain] }],
    })
  })

  it("strips a lead variant inside a blockquote", () => {
    const parsed = richText.parse({
      type: "doc",
      content: [{ type: "blockquote", content: [leadPara] }],
    })
    expect(JSON.stringify(parsed)).not.toContain("variant")
  })

  it("keeps a top-level lead and the checklist list variant", () => {
    const doc = {
      type: "doc",
      content: [
        leadPara,
        {
          type: "bulletList",
          attrs: { variant: "checklist" },
          content: [{ type: "listItem", content: [plain] }],
        },
      ],
    }
    expect(richText.parse(doc)).toEqual(doc)
  })
})
