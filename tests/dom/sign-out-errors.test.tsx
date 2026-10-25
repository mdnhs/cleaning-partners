import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace, refresh }),
}))

// Better Auth's client binds `fetch` when it is created (module import),
// so a fetch stubbed per test never reaches it: sign-out would go out over
// the network and its outcome would depend on what listens on the port.
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signOut },
}))

import { SignOutControl } from "@/components/admin/auth/sign-out-control"

// Phase 4's shell tests restore the user-menu and dock variants of this.
beforeEach(() => {
  signOut.mockReset()
  replace.mockReset()
  refresh.mockReset()
})

describe("plain header sign-out errors", () => {
  it("a failed sign-out shows the error and keeps the user on the page", async () => {
    const user = userEvent.setup()
    signOut.mockResolvedValue({
      data: null,
      error: { status: 503, statusText: "Unavailable", message: "Unavailable" },
    })
    render(<SignOutControl />)
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Unavailable")
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(replace).not.toHaveBeenCalled()
    // The button is usable again for a retry.
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled()
  })

  it("a thrown error reads as a generic failure", async () => {
    const user = userEvent.setup()
    signOut.mockRejectedValue(new Error("network down"))
    render(<SignOutControl />)
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again."
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it("a retry that works clears the error and leaves for sign-in", async () => {
    const user = userEvent.setup()
    signOut.mockResolvedValueOnce({
      data: null,
      error: { status: 503, statusText: "Unavailable", message: "Unavailable" },
    })
    signOut.mockResolvedValueOnce({ data: { success: true }, error: null })
    render(<SignOutControl />)
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    await screen.findByRole("alert")
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(replace).toHaveBeenCalledWith("/admin/sign-in?notice=signed-out")
    expect(refresh).toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
