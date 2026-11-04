import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SaveJobButton } from "@/components/careers/save-job-button"

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("SaveJobButton", () => {
  it("toggles the saved state and remembers it across a remount", async () => {
    const { unmount } = render(
      <SaveJobButton
        slug="domestic-cleaner"
        label="Save Job"
        savedLabel="Saved"
      />
    )
    const button = screen.getByRole("button", { name: "Save Job" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(JSON.parse(localStorage.getItem("cp:saved-jobs")!)).toEqual([
      "domestic-cleaner",
    ])
    unmount()
    render(
      <SaveJobButton
        slug="domestic-cleaner"
        label="Save Job"
        savedLabel="Saved"
      />
    )
    expect(
      await screen.findByRole("button", { name: "Saved" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("still works when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(<SaveJobButton slug="x" label="Save Job" savedLabel="Saved" />)
    await userEvent.click(screen.getByRole("button", { name: "Save Job" }))
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument()
  })
})
