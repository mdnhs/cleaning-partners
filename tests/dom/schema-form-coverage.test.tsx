import { QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"

import { makeQueryClient } from "@/components/admin/providers"
import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"
import { SchemaForm } from "@/components/admin/schema-form/schema-form"
import { serviceContent } from "@/lib/schemas/content/service"
import { testimonialSchema } from "@/lib/schemas/content/testimonial"
import { settingsSchemas } from "@/lib/schemas/settings"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { servicesFixture } from "@/server/db/seed/fixtures/services"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"
import { testimonialsFixture } from "@/server/db/seed/fixtures/testimonials"
import { templateEditorMeta } from "@/templates/editor-meta"
import { PAGES, type PageKey, templates } from "@/templates/registry"

const pages = pagesFixture(fixtureMediaLookup)
const settings = settingsFixture(fixtureMediaLookup)
const services = servicesFixture(fixtureMediaLookup)

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ items: [], page: 1, pageSize: 24, total: 0 }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    )
  )
})

/** resolveWidget throws for a schema node no widget can edit; rendering proves there is none. */
function renders(schema: z.ZodObject, meta: EditorMeta, value: unknown) {
  const { container, unmount } = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SchemaForm
        schema={schema}
        meta={meta}
        value={structuredClone(value) as never}
        onChange={vi.fn()}
      />
    </QueryClientProvider>
  )
  expect(
    container.querySelector("form, [data-slot='form-card']")
  ).not.toBeNull()
  unmount()
}

describe("every CP schema renders in SchemaForm with no missing widget (R4-8)", () => {
  it.each(Object.entries(templates))("template %s", (name, template) => {
    const key = (Object.keys(PAGES) as PageKey[]).find(
      (k) => PAGES[k] === name
    )!
    const page = pages[key]
    renders(
      template.schema as z.ZodObject,
      templateEditorMeta[name as keyof typeof templates],
      page.data
    )
  })

  // `theme` is edited by the Appearance screen, not SchemaForm.
  it.each(
    (Object.keys(settingsSchemas) as (keyof typeof settingsSchemas)[]).filter(
      (key) => key !== "theme"
    )
  )("settings %s", (key) => {
    renders(settingsSchemas[key] as z.ZodObject, { fields: {} }, settings[key])
  })

  it("serviceContent", () => {
    renders(serviceContent as z.ZodObject, { fields: {} }, services[0].content)
  })

  it("testimonialSchema", () => {
    renders(testimonialSchema, { fields: {} }, testimonialsFixture()[0])
  })
})
