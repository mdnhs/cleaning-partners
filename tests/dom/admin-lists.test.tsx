import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTablePagination } from "@/components/admin/data-table/data-table-pagination"

describe("DataTablePagination", () => {
  it("disables Next on an exactly full last page", () => {
    render(
      <DataTablePagination
        page={2}
        pageSize={20}
        total={40}
        onPageChange={vi.fn()}
      />
    )
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(nav).toHaveTextContent("21–40 of 40")
    expect(
      within(nav).getByRole("button", { name: "Next page" })
    ).toBeDisabled()
    expect(
      within(nav).getByRole("button", { name: "Previous page" })
    ).toBeEnabled()
  })

  it("clamps a page past the end to the last page", async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTablePagination
        page={9}
        pageSize={20}
        total={45}
        onPageChange={onPageChange}
      />
    )
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(nav).toHaveTextContent("41–45 of 45")
    expect(
      within(nav).getByRole("button", { name: "Next page" })
    ).toBeDisabled()
    await user.click(within(nav).getByRole("button", { name: "Previous page" }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("disables both buttons while the next page loads", () => {
    render(
      <DataTablePagination
        page={2}
        pageSize={20}
        total={60}
        disabled
        onPageChange={vi.fn()}
      />
    )
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(
      within(nav).getByRole("button", { name: "Next page" })
    ).toBeDisabled()
    expect(
      within(nav).getByRole("button", { name: "Previous page" })
    ).toBeDisabled()
  })

  it("shows the range and chevron buttons with names", async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTablePagination
        page={2}
        pageSize={20}
        total={45}
        onPageChange={onPageChange}
      />
    )
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(nav).toHaveTextContent("21–40 of 45")
    await user.click(within(nav).getByRole("button", { name: "Next page" }))
    expect(onPageChange).toHaveBeenCalledWith(3)
    await user.click(within(nav).getByRole("button", { name: "Previous page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("says No results and disables both buttons when empty", () => {
    render(
      <DataTablePagination
        page={1}
        pageSize={20}
        total={0}
        onPageChange={vi.fn()}
      />
    )
    const nav = screen.getByRole("navigation", { name: "Pagination" })
    expect(nav).toHaveTextContent("No results")
    expect(
      within(nav).getByRole("button", { name: "Next page" })
    ).toBeDisabled()
    expect(
      within(nav).getByRole("button", { name: "Previous page" })
    ).toBeDisabled()
  })
})
