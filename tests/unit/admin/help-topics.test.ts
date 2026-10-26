import { describe, expect, it } from "vitest"

import { HELP_TOPICS } from "@/components/admin/help/help-view"

const text = JSON.stringify(HELP_TOPICS).toLowerCase()

describe("Help topics", () => {
  it("has unique ids and real steps", () => {
    const ids = HELP_TOPICS.map((topic) => topic.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const topic of HELP_TOPICS) {
      expect(topic.title.length).toBeGreaterThan(0)
      expect(topic.summary.length).toBeGreaterThan(0)
      expect(topic.steps.length).toBeGreaterThan(0)
    }
  })

  it("covers pages, services, testimonials, blog, enquiries, media and settings", () => {
    for (const id of [
      "edit-a-page",
      "services",
      "testimonials",
      "blog",
      "enquiries",
      "media",
      "settings",
    ])
      expect(HELP_TOPICS.map((topic) => topic.id)).toContain(id)
  })

  it("names only Cleaning Partners' world, never another business's", () => {
    for (const word of [
      "security",
      "officer",
      "guard",
      "patrol",
      "insights",
      "enquire banner",
      "runbook",
    ])
      expect(text).not.toContain(word)
  })
})
