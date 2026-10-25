import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Editor } from "@tiptap/core"
import type { JSONContent } from "@tiptap/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeQueryClient } from "@/components/admin/providers"
import { RichTextEditor } from "@/components/admin/rich-text/editor"
import {
  normalizeRichTextDoc,
  richTextExtensions,
} from "@/components/admin/rich-text/extensions"
import type { WithMedia } from "@/lib/media"
import { ArticleBlocks } from "@/lib/rich-text/render"
import { richText, type RichTextDoc } from "@/lib/schemas/common"
import { articlesFixture } from "@/server/db/seed/fixtures/articles"

import * as frozen from "../unit/rich-text/frozen-markup"

const CHECK_ICON = "/images/services/check.svg"

const articles = articlesFixture((path) => ({
  mediaId: path,
  url: path,
})) as unknown as { slug: string; content: { body: RichTextDoc } }[]
const body = articles.find((a) => a.slug.startsWith("5-signs"))!.content.body

let editors: Editor[] = []
afterEach(() => {
  for (const e of editors) e.destroy()
  editors = []
})

function roundTrip(doc: object) {
  const editor = new Editor({
    extensions: richTextExtensions("full"),
    content: doc,
  })
  editors.push(editor)
  return normalizeRichTextDoc(editor.getJSON())
}

describe("variants survive the editor (load → save), R4-8", () => {
  it("the 5-signs body round-trips as deep-equal JSON", () => {
    // Guard: the fixture really carries both variants.
    expect(JSON.stringify(body)).toContain('"variant":"lead"')
    expect(JSON.stringify(body)).toContain('"variant":"checklist"')
    const saved = roundTrip(body)
    expect(saved).toEqual(body)
    expect(richText.parse(saved)).toEqual(body)
  })

  it("the saved JSON renders the frozen 5-signs markup WHOLE", () => {
    const html = renderToStaticMarkup(
      <ArticleBlocks
        doc={roundTrip(body) as unknown as WithMedia<RichTextDoc>}
        checkIcon={CHECK_ICON}
      />
    )
    expect(html).toBe(frozen.WHOLE)
  })
})

describe("RichTextEditor component keeps variants on save", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 }))
    )
  })

  it("an edit emits the variants and no null attrs", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(doc: JSONContent) => void>()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <RichTextEditor
          id="body"
          label="Body"
          value={body as unknown as JSONContent}
          onChange={onChange}
        />
      </QueryClientProvider>
    )
    const box = await screen.findByRole("textbox", { name: "Body" })
    await user.type(box, "!")
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const saved = onChange.mock.calls.at(-1)![0]
    expect(JSON.stringify(saved)).not.toContain('"variant":null')
    expect(saved.content![0]).toMatchObject({
      type: "paragraph",
      attrs: { variant: "lead" },
    })
    expect(
      saved.content!.some(
        (b) => b.type === "bulletList" && b.attrs?.variant === "checklist"
      )
    ).toBe(true)
    expect(richText.safeParse(saved).success).toBe(true)
  })

  it("the toolbar toggles lead and checklist on and off", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(doc: JSONContent) => void>()
    const plain: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Opening" }] },
      ],
    }
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <RichTextEditor
          id="body"
          label="Body"
          value={plain}
          onChange={onChange}
        />
      </QueryClientProvider>
    )
    await user.click(await screen.findByRole("textbox", { name: "Body" }))
    const last = () => onChange.mock.calls.at(-1)![0]
    await user.click(screen.getByRole("button", { name: "Lead paragraph" }))
    await waitFor(() =>
      expect(last().content![0].attrs).toEqual({ variant: "lead" })
    )
    await user.click(screen.getByRole("button", { name: "Lead paragraph" }))
    await waitFor(() => expect(last().content![0]).not.toHaveProperty("attrs"))

    await user.click(screen.getByRole("button", { name: "Checklist" }))
    await waitFor(() =>
      expect(last().content![0]).toMatchObject({
        type: "bulletList",
        attrs: { variant: "checklist" },
      })
    )
    await user.click(screen.getByRole("button", { name: "Checklist" }))
    await waitFor(() => expect(last().content![0]).not.toHaveProperty("attrs"))
    expect(richText.safeParse(last()).success).toBe(true)
  })
})
