import { QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeQueryClient } from "@/components/admin/providers"
import { SchemaForm } from "@/components/admin/schema-form/schema-form"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { templateEditorMeta } from "@/templates/editor-meta"
import type { HomeTemplate } from "@/templates/home/schema"
import { templates } from "@/templates/registry"

const home = pagesFixture(fixtureMediaLookup).home.data
const [MEDICAL, , RETAIL] = home.services.items.map((item) => item.description)

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
const SERVICE_OPTIONS = [
  ["medical-cleaning", "Medical Cleaning"],
  ["commercial-cleaning", "Commercial Cleaning"],
  ["retail-cleaning", "Retail Cleaning"],
].map(([value, label]) => ({ value, label, group: "Services" }))

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/options/services")
        ? json({ items: SERVICE_OPTIONS })
        : json({ items: [], page: 1, pageSize: 24, total: 0 })
    )
  )
})
afterEach(() => vi.restoreAllMocks())

function renderHome(errors?: Record<string, string[]>) {
  const onChange = vi.fn()
  const value = structuredClone(home)
  const view = (next?: Record<string, string[]>) => (
    <QueryClientProvider client={client}>
      <SchemaForm
        schema={templates.home.schema}
        meta={templateEditorMeta.home}
        value={value}
        onChange={onChange}
        errors={next}
      />
    </QueryClientProvider>
  )
  const client = makeQueryClient()
  const utils = render(view(errors))
  return {
    ...utils,
    onChange,
    setErrors: (next?: Record<string, string[]>) => utils.rerender(view(next)),
  }
}

/** Lets dnd-kit's effects and animation frames run between key presses. */
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))

const last = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.at(-1)![0] as HomeTemplate
const stats = () => screen.getByRole("group", { name: "Services" })
const stat = (n: number) =>
  within(stats()).getByRole("listitem", { name: `Service ${n}` })
const descriptions = (onChange: ReturnType<typeof vi.fn>) =>
  last(onChange).services.items.map((item) => item.description)

/** Edits Service 2's description (an edit inside an item, not to the array itself). */
async function editSecondLabel(user: ReturnType<typeof userEvent.setup>) {
  const label = within(stat(2)).getByRole("textbox", {
    name: "Short description",
  })
  await user.clear(label)
  await user.type(label, "Control room")
}

describe("SchemaForm lists keep edits made inside items", () => {
  it("survives move, add and remove", async () => {
    const user = userEvent.setup()
    const { onChange } = renderHome()
    await editSecondLabel(user)

    await user.click(
      within(stats()).getByRole("button", { name: "Move Service 1 down" })
    )
    expect(descriptions(onChange)).toEqual(["Control room", MEDICAL, RETAIL])
    expect(last(onChange).services.items[0].service).toBe("commercial-cleaning")

    await user.click(
      within(stats()).getByRole("button", { name: "Add service" })
    )
    expect(last(onChange).services.items[0].description).toBe("Control room")

    await user.click(
      within(stats()).getByRole("button", { name: "Remove Service 4" })
    )
    expect(descriptions(onChange)).toEqual(["Control room", MEDICAL, RETAIL])
  })

  it("survives a keyboard drag", async () => {
    // jsdom has no layout: each stat card is a 100px row inside a tall list.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const item = this.closest("li[aria-label^='Service ']")
        const index = item
          ? Array.from(item.parentElement!.children).indexOf(item)
          : 0
        const top = index * 100
        const height = item ? 90 : 1000
        return {
          x: 0,
          y: top,
          top,
          left: 0,
          width: 400,
          height,
          right: 400,
          bottom: top + height,
          toJSON: () => ({}),
        } as DOMRect
      }
    )
    const user = userEvent.setup()
    const { onChange } = renderHome()
    await editSecondLabel(user)

    const handle = within(stat(1)).getByRole("button", {
      name: "Drag to reorder Service 1",
    })
    handle.focus()
    fireEvent.keyDown(handle, { code: "Space", key: " " })
    await settle()
    fireEvent.keyDown(document.activeElement ?? handle, {
      code: "ArrowDown",
      key: "ArrowDown",
    })
    await settle()
    fireEvent.keyDown(document.activeElement ?? handle, {
      code: "Space",
      key: " ",
    })
    await waitFor(() =>
      expect(descriptions(onChange)).toEqual(["Control room", MEDICAL, RETAIL])
    )
  })
})

describe("SchemaForm home services list", () => {
  it("picks each item's service from the services collection", async () => {
    renderHome()
    const names = ["Medical Cleaning", "Commercial Cleaning", "Retail Cleaning"]
    for (const [i, name] of names.entries()) {
      const picker = within(stat(i + 1)).getByRole("combobox", {
        name: "Service",
      })
      await waitFor(() => expect(picker).toHaveTextContent(name))
      expect(
        within(stat(i + 1)).queryByRole("textbox", { name: "Service" })
      ).not.toBeInTheDocument()
    }
  })
})

describe("SchemaForm list focus and validation", () => {
  it("keeps focus on a Move button when an item reaches an end", async () => {
    const user = userEvent.setup()
    renderHome()
    within(stats()).getByRole("button", { name: "Move Service 2 down" }).focus()
    await user.keyboard("{Enter}")
    // Now last: its Move down is disabled, so focus goes to its Move up.
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName("Move Service 3 up")
    )
    await user.keyboard("{Enter}")
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName("Move Service 2 up")
    )
    await user.keyboard("{Enter}")
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName("Move Service 1 down")
    )
  })

  it("moves focus to a neighbour after removing an item", async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(
      within(stats()).getByRole("button", { name: "Remove Service 3" })
    )
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName(
        "Drag to reorder Service 2"
      )
    )
  })

  it("does not flag a newly added item's empty fields", async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(
      within(stats()).getByRole("button", { name: "Add service" })
    )
    await act(async () => {})
    for (const input of within(stat(4)).getAllByRole("textbox"))
      expect(input).not.toHaveAttribute("aria-invalid", "true")
    expect(within(stat(4)).queryByText("Required")).not.toBeInTheDocument()
  })
})

describe("SchemaForm error display", () => {
  it("shows form, group, list and nested errors and clears stale ones", async () => {
    const { setErrors } = renderHome({
      _root: ["This page changed elsewhere"],
      hero: ["Hero needs attention"],
      "services.items": ["Too many services"],
      "hero.background.mediaId": ["Image no longer exists"],
      "hero.subtitle": ["Too long"],
    })
    expect(
      await screen.findByText("This page changed elsewhere")
    ).toBeInTheDocument()
    const hero = screen.getByRole("region", { name: "Hero" })
    expect(hero).toHaveAccessibleDescription("Hero needs attention")
    expect(stats()).toHaveAccessibleDescription(
      expect.stringContaining("Too many services")
    )
    const image = within(hero).getByRole("button", {
      name: "Change image: Background image",
    })
    expect(image).toHaveAttribute("aria-invalid", "true")
    expect(image).toHaveAccessibleDescription("Image no longer exists")

    setErrors({ "hero.subtitle": ["Too long"] })
    await waitFor(() =>
      expect(
        screen.queryByText("This page changed elsewhere")
      ).not.toBeInTheDocument()
    )
    expect(screen.queryByText("Hero needs attention")).not.toBeInTheDocument()
    expect(screen.queryByText("Too many services")).not.toBeInTheDocument()
    expect(image).toHaveAttribute("aria-invalid", "false")
    expect(screen.getByText("Too long")).toBeInTheDocument()
  })

  it("labels the image button and registers link inputs", () => {
    renderHome()
    const hero = screen.getByRole("region", { name: "Hero" })
    const image = within(hero).getByRole("button", {
      name: "Change image: Background image",
    })
    expect(image).toHaveTextContent("Change image")
    expect(
      within(hero).getByText("Background image").closest("label")
    ).toHaveAttribute("for", image.id)
    const cta = within(hero).getByRole("group", { name: "Primary button" })
    expect(
      within(cta).getByRole("textbox", { name: "Link to" })
    ).toHaveAttribute("name", "hero.primaryCta.href")
    expect(within(cta).getByRole("textbox", { name: "Text" })).toHaveAttribute(
      "name",
      "hero.primaryCta.label"
    )
  })
})

describe("SchemaForm list-item errors (ledger P04-5)", () => {
  it("describes the item group by its own errors, without duplicate keys", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    // SchemaForm applies the first message per path: the same text twice
    // comes from the item itself and from a key no field renders.
    renderHome({
      "services.items.1": ["Description is inconsistent"],
      "services.items.1.description": ["Description is inconsistent"],
    })
    // If list items render collapsed (04b Task 13), open Service 2 first.
    const toggle = within(stat(2)).queryByRole("button", { expanded: false })
    if (toggle) fireEvent.click(toggle)
    const messages = await within(stat(2)).findAllByText(
      "Description is inconsistent"
    )
    expect(messages).toHaveLength(2)
    // ErrorText puts the text in a span inside its FieldError: the group's
    // error list is the FieldError's parent.
    const container = messages[0].parentElement!.parentElement!
    expect(container.id).not.toBe("")
    const described = document.querySelector(
      `[aria-describedby~="${container.id}"]`
    )
    expect(described).not.toBeNull()
    expect(described).toHaveAttribute("role", "group")
    // Named like its list item, so the group is not anonymous (axe).
    expect(described).toHaveAccessibleName("Service 2")
    expect(error.mock.calls.flat().join(" ")).not.toContain("same key")
    error.mockRestore()
  })
})
