import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { JSONContent } from "@tiptap/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { makeQueryClient } from "@/components/admin/providers"
import { RichTextEditor } from "@/components/admin/rich-text/editor"

// R5-3: Lead is a top-level paragraph variant only (lib/rich-text/render.tsx
// ignores it inside list items and quotes); the editor shows both variants.

const p = (text: string, attrs?: object): JSONContent => ({
  type: "paragraph",
  ...(attrs ? { attrs } : {}),
  content: [{ type: "text", text }],
})
const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
})

function mount(value: JSONContent) {
  const onChange = vi.fn<(d: JSONContent) => void>()
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <RichTextEditor
        id="body"
        label="Body"
        value={value}
        onChange={onChange}
      />
    </QueryClientProvider>
  )
  return onChange
}

const lead = () => screen.getByRole("button", { name: "Lead paragraph" })

describe("Lead toggle scope (R5-3)", () => {
  it("is enabled in a top-level paragraph", async () => {
    const user = userEvent.setup()
    mount(doc(p("Opening")))
    await user.click(await screen.findByText("Opening"))
    await waitFor(() => expect(lead()).toBeEnabled())
  })

  it("is disabled inside a list item", async () => {
    const user = userEvent.setup()
    mount(
      doc({
        type: "bulletList",
        content: [{ type: "listItem", content: [p("Item one")] }],
      })
    )
    await user.click(await screen.findByText("Item one"))
    await waitFor(() => expect(lead()).toBeDisabled())
  })

  it("is disabled inside an ordered list item", async () => {
    const user = userEvent.setup()
    mount(
      doc({
        type: "orderedList",
        content: [{ type: "listItem", content: [p("Step one")] }],
      })
    )
    await user.click(await screen.findByText("Step one"))
    await waitFor(() => expect(lead()).toBeDisabled())
  })

  it("is disabled inside a blockquote", async () => {
    const user = userEvent.setup()
    mount(doc({ type: "blockquote", content: [p("Quoted words")] }))
    await user.click(await screen.findByText("Quoted words"))
    await waitFor(() => expect(lead()).toBeDisabled())
  })

  it("never writes a variant into a list item or quote", async () => {
    const user = userEvent.setup()
    const onChange = mount(
      doc({
        type: "bulletList",
        content: [{ type: "listItem", content: [p("Item one")] }],
      })
    )
    await user.click(await screen.findByText("Item one"))
    await waitFor(() => expect(lead()).toBeDisabled())
    await user.click(lead())
    await user.keyboard("!")
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(JSON.stringify(onChange.mock.calls.at(-1)![0])).not.toContain(
      "variant"
    )
  })
})

describe("variant styling hooks (R5-3)", () => {
  it("renders data-variant on the lead paragraph and the checklist", async () => {
    mount(
      doc(
        p("Opening", { variant: "lead" }),
        {
          type: "bulletList",
          attrs: { variant: "checklist" },
          content: [{ type: "listItem", content: [p("Tick")] }],
        },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [p("Plain")] }],
        }
      )
    )
    const box = await screen.findByRole("textbox", { name: "Body" })
    expect(box.querySelector('p[data-variant="lead"]')).toHaveTextContent(
      "Opening"
    )
    expect(box.querySelectorAll('ul[data-variant="checklist"]')).toHaveLength(1)
    expect(box.querySelectorAll("ul:not([data-variant])")).toHaveLength(1)
  })

  it("admin.css styles both hooks inside the editing surface", () => {
    const css = readFileSync(
      join(process.cwd(), "app/(admin)/admin/admin.css"),
      "utf8"
    )
    expect(css).toMatch(
      /\.rich-text-content p\[data-variant="lead"\]\s*\{[^}]*font-size/
    )
    expect(css).toMatch(
      /\.rich-text-content ul\[data-variant="checklist"\]\s*\{[^}]*list-style: none/
    )
    expect(css).toMatch(
      /ul\[data-variant="checklist"\] > li::before\s*\{[^}]*content/
    )
  })
})
