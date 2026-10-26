import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
}))

import {
  type CopySeed,
  NewPageDialog,
} from "@/components/admin/builder/new-page-dialog"
import { makeQueryClient } from "@/components/admin/providers"

const bodies: unknown[] = []
let reply: () => Response

function renderDialog(copy?: CopySeed) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NewPageDialog open onOpenChange={vi.fn()} copy={copy} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  bodies.length = 0
  nav.push.mockClear()
  reply = () => Response.json({ id: "0192a-new" }, { status: 201 })
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      return reply()
    })
  )
})

describe("NewPageDialog", () => {
  it("makes the address from the title, then opens the builder", async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText("Title"), "Spring clean")
    expect(screen.getByLabelText("Address")).toHaveValue("spring-clean")
    await user.click(screen.getByRole("button", { name: "Create page" }))
    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith("/admin/pages/custom/0192a-new")
    )
    expect(bodies).toEqual([{ title: "Spring clean", slug: "spring-clean" }])
  })

  it("keeps an address typed by hand", async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText("Address"), "offers")
    await user.type(screen.getByLabelText("Title"), "Spring clean")
    expect(screen.getByLabelText("Address")).toHaveValue("offers")
  })

  it("does not post an empty title or a bad address", async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole("button", { name: "Create page" }))
    expect(await screen.findByText("Enter a title")).toBeInTheDocument()
    expect(screen.getByText("Enter an address")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Address"), "Bad Address")
    expect(
      screen.getByText("Use lowercase letters, numbers and single hyphens")
    ).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it("shows the server's address error and stays open", async () => {
    reply = () =>
      Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "Taken",
            fieldErrors: { slug: ["This address is already used"] },
          },
        },
        { status: 409 }
      )
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText("Title"), "Spring clean")
    await user.click(screen.getByRole("button", { name: "Create page" }))
    expect(
      await screen.findByText("This address is already used")
    ).toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
  })

  it("copies: suggested names, the seed is sent, 'Create copy' navigates", async () => {
    const seed = {
      blocks: [
        {
          id: "blk-1",
          type: "contact" as const,
          anchor: "contact",
          hidden: false,
          data: { useShared: true, title: null },
        },
      ],
    }
    const user = userEvent.setup()
    renderDialog({ title: "Contact copy", slug: "contact-copy", seed })
    expect(
      screen.getByRole("dialog", { name: "Copy to a new page" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Title")).toHaveValue("Contact copy")
    expect(screen.getByLabelText("Address")).toHaveValue("contact-copy")
    await user.click(screen.getByRole("button", { name: "Create copy" }))
    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith("/admin/pages/custom/0192a-new")
    )
    expect(bodies).toEqual([
      { title: "Contact copy", slug: "contact-copy", seed },
    ])
  })
})
