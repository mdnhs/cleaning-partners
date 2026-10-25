import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"

const { push, replace, router, search } = vi.hoisted(() => {
  const push = vi.fn()
  const replace = vi.fn()
  const router = { push, replace, refresh: vi.fn() }
  return { push, replace, router, search: { current: new URLSearchParams() } }
})
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/collections/testimonials",
  useRouter: () => router,
  useSearchParams: () => search.current,
}))

import { COLLECTION_CONFIGS } from "@/components/admin/collections/configs"
import { CollectionScreen } from "@/components/admin/collections/collection-screen"
import { makeQueryClient } from "@/components/admin/providers"
import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"
import { AdminShell } from "@/components/admin/shell/admin-shell"
import { serviceEditorMeta } from "@/components/admin/services/service-meta"
import { settingsEditorMeta } from "@/components/admin/settings/settings-meta"
import { EDITABLE_SETTINGS_KEYS } from "@/lib/admin/settings-keys"
import { COLLECTIONS, collectionSchemas } from "@/lib/schemas/api/collections"
import { serviceContent } from "@/lib/schemas/content/service"
import { settingsSchemas } from "@/lib/schemas/settings"
import { templateEditorMeta } from "@/templates/editor-meta"
import { templates } from "@/templates/registry"

import { pickOption } from "./select-helper"

const item = (i: number, over: Record<string, unknown> = {}) => ({
  id: `00000000-0000-7000-8000-00000000000${i}`,
  name: `Customer ${i}`,
  initials: `C${i}`,
  quote: `Quote number ${i}`,
  rating: 5,
  sortOrder: i,
  updatedAt: "2026-10-16T09:00:00.000Z",
  ...over,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const fetchMock = vi.fn()
let writes: { method: string; path: string; body: Record<string, unknown> }[]

beforeEach(() => {
  push.mockReset()
  replace.mockReset()
  writes = []
  search.current = new URLSearchParams()
  fetchMock.mockReset()
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost")
      const method = init?.method ?? "GET"
      if (method === "GET" && url.pathname === "/api/v1/admin/testimonials")
        return json(200, {
          items: [item(1), item(2, { rating: 4 })],
          page: 1,
          pageSize: 20,
          total: 2,
        })
      if (method === "POST" && url.pathname === "/api/v1/admin/testimonials") {
        const body = JSON.parse(String(init?.body))
        writes.push({ method, path: url.pathname, body })
        return json(201, item(3, body))
      }
      return json(404, { error: { code: "NOT_FOUND", message: "x" } })
    }
  )
  vi.stubGlobal("fetch", fetchMock)
})

function renderScreen() {
  return render(
    <AdminShell
      queryClient={makeQueryClient()}
      session={{
        user: {
          id: "u",
          name: "U",
          email: "u@x.test",
          title: null,
          twoFactorEnabled: true,
        },
        roles: ["editor"],
        impersonatedBy: null,
      }}
    >
      <CollectionScreen name="testimonials" />
    </AdminShell>
  )
}

describe("testimonials collection screen (R4-3)", () => {
  it("lists name, quote and rating", async () => {
    renderScreen()
    const table = await screen.findByRole("table", { name: "Testimonials" })
    expect(within(table).getAllByRole("row")).toHaveLength(3)
    expect(within(table).getByText("Quote number 1")).toBeInTheDocument()
    expect(within(table).getByText("4 / 5")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add testimonial" })
    ).toBeVisible()
  })

  it("adds a testimonial: quote is a textarea, rating a 1-5 select saved as a number", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("table", { name: "Testimonials" })
    await user.click(screen.getByRole("button", { name: "Add testimonial" }))
    const sheet = await screen.findByRole("dialog", { name: "Testimonial" })
    expect(within(sheet).getByRole("textbox", { name: "Quote" }).tagName).toBe(
      "TEXTAREA"
    )
    await user.type(
      within(sheet).getByRole("textbox", { name: "Name" }),
      "Dana"
    )
    await user.type(
      within(sheet).getByRole("textbox", { name: "Initials" }),
      "DB"
    )
    await user.type(
      within(sheet).getByRole("textbox", { name: "Quote" }),
      "Spotless."
    )
    await pickOption(
      user,
      within(sheet).getByRole("combobox", { name: "Rating" }),
      "3 stars"
    )
    await user.click(within(sheet).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0].body).toEqual({
      name: "Dana",
      initials: "DB",
      quote: "Spotless.",
      rating: 3,
    })
  })

  it("offers exactly the ratings 1 to 5", async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole("table", { name: "Testimonials" })
    await user.click(screen.getByRole("button", { name: "Add testimonial" }))
    const sheet = await screen.findByRole("dialog", { name: "Testimonial" })
    await user.click(within(sheet).getByRole("combobox", { name: "Rating" }))
    const labels = (await screen.findAllByRole("option")).map((o) =>
      o.textContent?.trim()
    )
    expect(labels).toEqual([
      "1 star",
      "2 stars",
      "3 stars",
      "4 stars",
      "5 stars",
    ])
  })
})

/** Both directions: every schema field is grouped; no meta key is stale. */
function metaMatchesSchema(meta: EditorMeta, schema: z.ZodObject) {
  const keys = Object.keys(schema.shape)
  const groups = meta.groups?.[""]
  if (groups) {
    const listed = groups.flatMap((g) => g.fields)
    expect(new Set(listed).size, "a field is listed twice").toBe(listed.length)
    expect(
      [...listed].sort(),
      "every schema field is in a group, and only real ones"
    ).toEqual([...keys].sort())
  }
  for (const key of Object.keys(meta.fields ?? {}).filter(
    (k) => !k.includes(".")
  ))
    expect(keys, `stale meta key "${key}"`).toContain(key)
}

describe("editor meta matches its schema in both directions (Task 5 minor)", () => {
  it("service-meta", () => {
    metaMatchesSchema(serviceEditorMeta, serviceContent as z.ZodObject)
  })

  it.each(COLLECTIONS)("collection %s", (name) => {
    metaMatchesSchema(COLLECTION_CONFIGS[name].meta, collectionSchemas[name])
  })

  it.each(EDITABLE_SETTINGS_KEYS)("settings-meta %s", (key) => {
    metaMatchesSchema(
      settingsEditorMeta[key],
      settingsSchemas[key] as z.ZodObject
    )
  })

  it.each(Object.keys(templates))("template meta %s", (name) => {
    metaMatchesSchema(
      templateEditorMeta[name as keyof typeof templates],
      templates[name as keyof typeof templates].schema as z.ZodObject
    )
  })
})
