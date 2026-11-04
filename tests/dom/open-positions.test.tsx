import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

import { OpenPositions } from "@/components/careers/open-positions"
import type { JobRowView, OpenPositionsProps } from "@/components/careers/types"

const row = (
  title: string,
  category: string,
  location: string,
  type: string
): JobRowView => ({
  slug: title.toLowerCase().replace(/[^a-z]+/g, "-"),
  href: `/careers/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  title,
  category,
  location,
  type,
  hours: "20 hrs/week",
  pay: "€14.50/hr",
  posted: "Posted 3 days ago",
})

const props: OpenPositionsProps = {
  eyebrow: "NOW HIRING",
  title: "Open Positions",
  intro: "Find a role.",
  count: "3 open roles",
  searchPlaceholder: "Search by job title or keyword",
  allLocations: "All Locations",
  allTypes: "All Job Types",
  openPill: "Open",
  viewJob: "View Job",
  emptyText: "No open roles match your search.",
  jobs: [
    row(
      "Cleaning Operative – Healthcare",
      "Healthcare",
      "Portlaoise, Co. Laois",
      "Part-time"
    ),
    row(
      "Commercial Cleaner – Evenings",
      "Commercial",
      "Tullamore, Co. Offaly",
      "Part-time"
    ),
    row(
      "Cleaning Supervisor",
      "Supervisory",
      "Athlone, Co. Westmeath",
      "Full-time"
    ),
  ],
  filters: {
    allRoles: "All Roles (3)",
    categories: [
      { name: "Healthcare", count: 1 },
      { name: "Commercial", count: 1 },
      { name: "Supervisory", count: 1 },
    ],
    locations: [
      "Portlaoise, Co. Laois",
      "Tullamore, Co. Offaly",
      "Athlone, Co. Westmeath",
    ],
    types: ["Part-time", "Full-time"],
  },
}

const titles = () =>
  within(screen.getByRole("list", { name: "Open Positions" }))
    .queryAllByRole("heading", { level: 3 })
    .map((h) => h.textContent)

describe("OpenPositions", () => {
  it("lists every open job with its View Job link", () => {
    render(<OpenPositions {...props} />)
    expect(titles()).toHaveLength(3)
    expect(
      screen.getAllByRole("link", { name: /View Job/ })[0]
    ).toHaveAttribute("href", props.jobs[0]!.href)
  })

  it("search matches title, location or category, ignoring case", async () => {
    render(<OpenPositions {...props} />)
    await userEvent.type(screen.getByRole("searchbox"), "tull")
    expect(titles()).toEqual(["Commercial Cleaner – Evenings"])
    await userEvent.clear(screen.getByRole("searchbox"))
    await userEvent.type(screen.getByRole("searchbox"), "SUPERVISORY")
    expect(titles()).toEqual(["Cleaning Supervisor"])
  })

  it("a category chip narrows the list; All Roles brings everything back", async () => {
    render(<OpenPositions {...props} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Healthcare (1)" })
    )
    expect(titles()).toEqual(["Cleaning Operative – Healthcare"])
    expect(
      screen.getByRole("button", { name: "Healthcare (1)" })
    ).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: "All Roles (3)" }))
    expect(titles()).toHaveLength(3)
  })

  it("location and job type selects filter, and the All options restore", async () => {
    render(<OpenPositions {...props} />)
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "All Locations" }),
      "Athlone, Co. Westmeath"
    )
    expect(titles()).toEqual(["Cleaning Supervisor"])
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "All Locations" }),
      ""
    )
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "All Job Types" }),
      "Part-time"
    )
    expect(titles()).toHaveLength(2)
  })

  it("says so when nothing matches", async () => {
    render(<OpenPositions {...props} />)
    await userEvent.type(screen.getByRole("searchbox"), "astronaut")
    expect(titles()).toEqual([])
    expect(
      screen.getByText("No open roles match your search.")
    ).toBeInTheDocument()
  })
})
