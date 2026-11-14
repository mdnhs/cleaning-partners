import { QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { makeQueryClient } from "@/components/admin/providers"
import { SchemaForm } from "@/components/admin/schema-form/schema-form"
import { link } from "@/lib/schemas/common"

afterEach(cleanup)

const nullableSchema = z.object({ loginLink: link.nullable() })
const requiredSchema = z.object({ cta: link })

function Harness({
  schema,
  initial,
  spy,
  meta = { fields: {} },
}: {
  schema: z.ZodType
  initial: unknown
  spy: (v: unknown) => void
  meta?: unknown
}) {
  const [value, setValue] = useState(initial)
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <SchemaForm
        schema={schema as never}
        meta={meta as never}
        value={value as never}
        onChange={(v: unknown) => {
          setValue(v)
          spy(v)
        }}
      />
    </QueryClientProvider>
  )
}

const last = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)![0]

describe("nullable link field", () => {
  it("Remove saves null", async () => {
    const spy = vi.fn()
    render(
      <Harness
        schema={nullableSchema}
        initial={{ loginLink: { label: "Login", href: "/admin/sign-in" } }}
        spy={spy}
      />
    )
    await userEvent.click(
      screen.getByRole("button", { name: /Remove: Login link/i })
    )
    await waitFor(() => expect(last(spy)).toEqual({ loginLink: null }))
  })

  it("Add link restores editable inputs and saves the object", async () => {
    const spy = vi.fn()
    render(
      <Harness
        schema={nullableSchema}
        initial={{ loginLink: null }}
        spy={spy}
      />
    )
    expect(screen.queryByRole("textbox")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /Add link/i }))
    await userEvent.type(screen.getByRole("textbox", { name: /Text/ }), "Staff")
    await userEvent.type(
      screen.getByRole("textbox", { name: /Link to/ }),
      "/staff"
    )
    await waitFor(() =>
      expect(last(spy)).toEqual({
        loginLink: { label: "Staff", href: "/staff" },
      })
    )
  })

  it("Add link is described by the field's help", () => {
    render(
      <Harness
        schema={nullableSchema}
        initial={{ loginLink: null }}
        meta={{
          fields: { loginLink: { help: "Shown after the legal links." } },
        }}
        spy={vi.fn()}
      />
    )
    expect(
      screen.getByRole("button", { name: /Add link/ })
    ).toHaveAccessibleDescription("Shown after the legal links.")
  })

  it("a required link has no Remove button", () => {
    render(
      <Harness
        schema={requiredSchema}
        initial={{ cta: { label: "Go", href: "/go" } }}
        spy={vi.fn()}
      />
    )
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull()
  })
})
