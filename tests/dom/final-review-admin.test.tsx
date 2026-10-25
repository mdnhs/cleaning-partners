/* eslint-disable @next/next/no-html-link-for-pages -- plain <a> links exercise the guard's document-level click interception */
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Final review 3 (admin UI/UX/a11y): the shared pieces behind I1–I8.
const { push, replace } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pages/home",
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

import { ProfileForm } from "@/components/admin/account/profile-form"
import { SaveStateIndicator } from "@/components/admin/editor/save-state"
import {
  formChanged,
  UnsavedChangesProvider,
  UnsavedGuard,
  useConfirmLeave,
} from "@/components/admin/editor/unsaved-guard"
import { makeQueryClient } from "@/components/admin/providers"
import { AdminShell } from "@/components/admin/shell/admin-shell"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useAutosave } from "@/hooks/use-autosave"

beforeEach(() => {
  push.mockReset()
  replace.mockReset()
})

const onNav = vi.fn((event: React.MouseEvent) => event.preventDefault())

function Dirty({ initial = true }: { initial?: boolean }) {
  const [dirty, setDirty] = useState(initial)
  const confirmLeave = useConfirmLeave()
  const [answer, setAnswer] = useState("")
  return (
    <>
      <UnsavedGuard when={dirty} />
      {/* Stands in for next/link: its own click handler navigates. */}
      <a href="/admin/services" onClick={onNav}>
        Services
      </a>
      <a href="/api/v1/admin/leads/export.csv" onClick={onNav}>
        Export
      </a>
      {/* In-page links: only honoured on the current path. */}
      <a href="?tab=seo" data-in-page="" onClick={onNav}>
        Same page
      </a>
      <a href="/admin/blog?tab=seo" data-in-page="" onClick={onNav}>
        Other page
      </a>
      <button type="button" onClick={() => setDirty(false)}>
        Mark saved
      </button>
      <button
        type="button"
        onClick={() =>
          void confirmLeave().then((leave) => setAnswer(String(leave)))
        }
      >
        Sign out
      </button>
      <button
        type="button"
        onClick={() => {
          void confirmLeave().then((leave) => setAnswer(`first:${leave}`))
          void confirmLeave()
        }}
      >
        Ask twice
      </button>
      <output>{answer}</output>
    </>
  )
}

const renderGuarded = (initial = true) =>
  render(
    <UnsavedChangesProvider>
      <Dirty initial={initial} />
    </UnsavedChangesProvider>
  )

/** history.back() in jsdom: popstate arrives in a later task. */
const goBack = () =>
  act(async () => {
    window.history.back()
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

const leaveDialog = () =>
  screen.findByRole("alertdialog", { name: "Leave without saving?" })

describe("shell unsaved-changes registry (I2/I3)", () => {
  beforeEach(() => {
    onNav.mockClear()
  })

  it("asks before an in-app link leaves, then lets the link itself navigate", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await user.click(screen.getByRole("link", { name: "Services" }))
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Keep editing" })
    )
    expect(onNav).not.toHaveBeenCalled()

    await user.click(screen.getByRole("link", { name: "Services" }))
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Leave page" })
    )
    // Re-dispatched to the link (Link keeps scroll={false}/replace), not
    // re-routed through router.push.
    await waitFor(() => expect(onNav).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("never intercepts /api/* links or links once the edits are saved (N2)", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await user.click(screen.getByRole("link", { name: "Export" }))
    expect(onNav).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    // Armed (guard entry pushed) but clean: links are left alone.
    await user.click(screen.getByRole("button", { name: "Mark saved" }))
    await user.click(screen.getByRole("link", { name: "Services" }))
    expect(onNav).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("data-in-page skips the prompt only for the current path (re-review D1.4 item 4)", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await user.click(screen.getByRole("link", { name: "Same page" }))
    expect(onNav).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    // Misused on a link to another page: still asks.
    await user.click(screen.getByRole("link", { name: "Other page" }))
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Keep editing" })
    )
    expect(onNav).toHaveBeenCalledTimes(1)
  })

  it("lets programmatic leaves (sign-out) ask too", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Keep editing" })
    )
    expect(await screen.findByRole("status")).toHaveTextContent("false")
  })

  it("a second ask settles the first as stay, never leaving it pending (N3)", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await user.click(screen.getByRole("button", { name: "Ask twice" }))
    // (The open dialog makes the page inert, so match the text directly.)
    expect(await screen.findByText("first:false")).toBeInTheDocument()
    expect(await leaveDialog()).toBeInTheDocument()
  })

  it("answers at once when nothing is unsaved", async () => {
    const user = userEvent.setup()
    renderGuarded(false)
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(await screen.findByRole("status")).toHaveTextContent("true")
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("Back from a ?tab= step lands on the guard entry: no prompt (N1)", async () => {
    renderGuarded()
    await waitFor(() =>
      expect(window.history.state).toMatchObject({
        __cpUnsaved: expect.any(String),
      })
    )
    // SectionTabs: a click pushes ?tab= (no guard marker on that entry).
    window.history.pushState(null, "", "/?tab=hero")
    await goBack()
    expect(window.location.search).toBe("")
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("Back off the page asks; Stay guards again, so the next Back asks too (N1)", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await waitFor(() =>
      expect(window.history.state).toMatchObject({
        __cpUnsaved: expect.any(String),
      })
    )
    await goBack()
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Keep editing" })
    )
    // The guard entry is back on top.
    expect(window.history.state).toMatchObject({
      __cpUnsaved: expect.any(String),
    })
    await goBack()
    await user.click(
      within(await leaveDialog()).getByRole("button", { name: "Leave page" })
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    // The confirmed Back landed on the same, still dirty page (jsdom has no
    // other page): the guard is armed again rather than left off.
    expect(window.history.state).toMatchObject({
      __cpUnsaved: expect.any(String),
    })
  })

  it("passes a Back press through once the edits are saved", async () => {
    const user = userEvent.setup()
    renderGuarded()
    await waitFor(() =>
      expect(window.history.state).toMatchObject({
        __cpUnsaved: expect.any(String),
      })
    )
    await user.click(screen.getByRole("button", { name: "Mark saved" }))
    const back = vi.spyOn(window.history, "back")
    await goBack()
    expect(screen.queryByRole("alertdialog")).toBeNull()
    // Ours plus the pass-through.
    expect(back).toHaveBeenCalledTimes(2)
    back.mockRestore()
  })

  it("opens above an open sheet and takes focus", async () => {
    const user = userEvent.setup()
    function SheetWithGuard() {
      const confirmLeave = useConfirmLeave()
      return (
        <Sheet open>
          <SheetContent side="right">
            <SheetTitle>Record</SheetTitle>
            <UnsavedGuard when />
            <button type="button" onClick={() => void confirmLeave()}>
              Leave via sign-out
            </button>
          </SheetContent>
        </Sheet>
      )
    }
    render(
      <UnsavedChangesProvider>
        <SheetWithGuard />
      </UnsavedChangesProvider>
    )
    await user.click(screen.getByRole("button", { name: "Leave via sign-out" }))
    const dialog = await leaveDialog()
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    )
    // Interactive (not inert behind the sheet's modal layer).
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" })
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(screen.getByRole("dialog", { name: "Record" })).toBeInTheDocument()
  })
  it("routes ⌘K navigation through the same guard", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    )
    render(
      <AdminShell
        queryClient={makeQueryClient()}
        session={{
          user: {
            id: "u1",
            name: "Edith Editor",
            email: "e@example.test",
            title: null,
            twoFactorEnabled: true,
          },
          roles: ["editor"],
          impersonatedBy: null,
        }}
      >
        <UnsavedGuard when />
      </AdminShell>
    )
    await user.keyboard("{Control>}k{/Control}")
    const palette = await screen.findByRole("dialog", {
      name: "Search the admin",
    })
    await user.click(
      await within(palette).findByRole("option", { name: /^Services/ })
    )
    expect(
      await screen.findByRole("alertdialog", { name: "Leave without saving?" })
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("dock and menu sign-out ask first while something is unsaved", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(
      // Typed for mock.calls (the sign-out URL is checked below).
      async (input: RequestInfo | URL) => {
        void input
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
    )
    vi.stubGlobal("fetch", fetchMock)
    render(
      <AdminShell
        queryClient={makeQueryClient()}
        session={{
          user: {
            id: "u1",
            name: "Edith Editor",
            email: "e@example.test",
            title: null,
            twoFactorEnabled: true,
          },
          roles: ["editor"],
          impersonatedBy: null,
        }}
      >
        <UnsavedGuard when />
      </AdminShell>
    )
    await user.click(screen.getAllByRole("button", { name: "Log out" })[0])
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "Leave without saving?",
        })
      ).getByRole("button", { name: "Keep editing" })
    )
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/auth/sign-out")
      )
    ).toBe(false)
  })

  it("⌘K Sign out asks first while something is unsaved (MK B6)", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      void input
      return Response.json({ items: [] })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(
      <AdminShell
        queryClient={makeQueryClient()}
        session={{
          user: {
            id: "u1",
            name: "Edith Editor",
            email: "e@example.test",
            title: null,
            twoFactorEnabled: true,
          },
          roles: ["editor"],
          impersonatedBy: null,
        }}
      >
        <UnsavedGuard when />
      </AdminShell>
    )
    await user.keyboard("{Control>}k{/Control}")
    const palette = await screen.findByRole("dialog", {
      name: "Search the admin",
    })
    await user.click(within(palette).getByRole("option", { name: "Sign out" }))
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "Leave without saving?",
        })
      ).getByRole("button", { name: "Keep editing" })
    )
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/auth/sign-out")
      )
    ).toBe(false)
  })

  it("account forms count as unsaved once a field changes", async () => {
    const user = userEvent.setup()
    render(
      <UnsavedChangesProvider>
        <ProfileForm name="Edith" email="e@x.test" title={null} />
        <a href="/admin">Dashboard</a>
      </UnsavedChangesProvider>
    )
    await user.type(screen.getByLabelText("Job title"), "Editor")
    await user.click(screen.getByRole("link", { name: "Dashboard" }))
    expect(
      await screen.findByRole("alertdialog", { name: "Leave without saving?" })
    ).toBeInTheDocument()
  })

  it("formChanged compares fields with their initial values", () => {
    const form = document.createElement("form")
    form.innerHTML =
      '<input name="a" value="x"><textarea name="b">y</textarea><select name="c"><option>1</option><option>2</option></select>'
    document.body.append(form)
    expect(formChanged(form)).toBe(false)
    ;(form.elements.namedItem("c") as HTMLSelectElement).value = "2"
    expect(formChanged(form)).toBe(true)
    form.remove()
  })
})

describe("save status announcements (M4)", () => {
  const live = () =>
    document.querySelector('[aria-live="polite"]') as HTMLElement

  it("the pill is not a live region; autosave cycles stay silent", () => {
    const { rerender } = render(<SaveStateIndicator state="unsaved" />)
    const pill = screen.getByRole("status", { name: /^Save status/ })
    expect(pill).toHaveAttribute("aria-live", "off")
    expect(live()).toBeEmptyDOMElement()
    rerender(<SaveStateIndicator state="saving" />)
    rerender(<SaveStateIndicator state="saved" />)
    expect(live()).toBeEmptyDOMElement()
  })

  it("announces failures and conflicts, and Saved after ⌘S", () => {
    const { rerender } = render(<SaveStateIndicator state="error" />)
    expect(live()).toHaveTextContent("Not saved")
    rerender(<SaveStateIndicator state="conflict" />)
    expect(live()).toHaveTextContent("Conflict")
    rerender(<SaveStateIndicator state="saved" savedOnRequest />)
    expect(live()).toHaveTextContent("Saved")
  })
})

describe("autosave validation cost (M3)", () => {
  it("parses once per changed value, never for a saved one", () => {
    const isValid = vi.fn(() => true)
    const save = vi.fn(async () => {})
    const saved = { a: 1 }
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, savedValue: saved, save, isValid }),
      { initialProps: { value: saved } }
    )
    expect(isValid).not.toHaveBeenCalled()
    const edited = { a: 2 }
    rerender({ value: edited })
    rerender({ value: edited })
    rerender({ value: edited })
    expect(isValid).toHaveBeenCalledTimes(1)
  })
})
