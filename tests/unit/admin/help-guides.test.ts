import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { HELP_GUIDES } from "@/components/admin/help/help-view"

describe("Help page guides", () => {
  it("every guide is a section heading of docs/runbook.md", () => {
    const headings = readFileSync("docs/runbook.md", "utf8")
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3).trim())
    expect(HELP_GUIDES.length).toBeGreaterThan(0)
    for (const guide of HELP_GUIDES) expect(headings).toContain(guide.title)
  })

  it("lists each guide once", () => {
    const titles = HELP_GUIDES.map((guide) => guide.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const guide of HELP_GUIDES)
      expect(guide.steps.length).toBeGreaterThan(0)
  })
})
