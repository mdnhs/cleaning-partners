import { globSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { HELP_TOPICS, SHORTCUTS } from "@/components/admin/help/help-view"

// Topics, shortcuts and the cards' own titles and descriptions: the whole
// source of the Help screen, so nothing in it escapes the scan.
const viewSource = readFileSync("components/admin/help/help-view.tsx", "utf8")
const text = [
  JSON.stringify(HELP_TOPICS),
  JSON.stringify(SHORTCUTS),
  // "Content-Security-Policy" is a runbook guide's title, not another business.
  viewSource.replaceAll("Content-Security-Policy", "csp"),
]
  .join("\n")
  .toLowerCase()

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
      "guard",
      "guarding",
      "officer",
      "patrol",
      "alarm",
      "keyholding",
      "cctv",
      "manned",
      "static guarding",
      "insights",
      "enquire banner",
      "operations",
    ])
      expect(text, word).not.toMatch(new RegExp(`\\b${word}\\b`))
  })

  it("makes no claim the upload pipeline does not keep (it never resizes)", () => {
    expect(text).not.toMatch(/1600|resized/)
  })
})

/**
 * Every menu item, tab, button or card Help tells people to press must exist
 * in the admin under that exact name (the labels drifted once: "About us",
 * "Revisions", "Users"). Labels built at run time map to the pieces that
 * build them.
 */
const UI_LABELS: Record<string, string[]> = {
  Pages: ["Pages"],
  Home: ["Home"],
  About: ["About"],
  Publish: ["Publish"],
  History: ["History"],
  Services: ["Services"],
  "New service": ["New service"],
  Collections: ["Collections"],
  Testimonials: ["Testimonials"],
  "Change order": ["Change order"],
  Team: ["Team"],
  Clients: ["Clients"],
  "Group companies": ["Group companies"],
  Blog: ["Blog"],
  "New article": ["New article"],
  Categories: ["Categories"],
  Enquiries: ["Enquiries"],
  Media: ["Media"],
  "Site settings": ["Site settings"],
  "Contact details": ["Contact details"],
  Navigation: ["Navigation"],
  Footer: ["Footer"],
  "Why choose us": ["Why choose us"],
  "Testimonials section": ["Testimonials section"],
  "How it works": ["How it works"],
  "Users & roles": ["Users & roles"],
  "Invite user": ["Invite user"],
  "Activity log": ["Activity log"],
  Account: ["Account"],
  // JSX text built from the collection: `Add {singular.toLowerCase()}`.
  "Add testimonial": [
    "Add {config.singular.toLowerCase()}",
    'singular: "Testimonial"',
  ],
  // `Choose ${noun}` with noun "image".
  "Choose image": ["`Choose ${noun}`", 'lottie ? "animation" : "image"'],
}

describe("Help names real UI labels", () => {
  const sources = globSync("{components,lib/admin}/**/*.{ts,tsx}")
    .filter((f) => f !== "components/admin/help/help-view.tsx")
    .map((f) => readFileSync(f, "utf8"))
    .join("\n")
  const helpText = [
    ...HELP_TOPICS.flatMap((t) => [t.title, t.summary, ...t.steps]),
    ...SHORTCUTS.map((s) => s.action),
  ].join("\n")

  it.each(Object.entries(UI_LABELS))(
    "%s exists in the admin",
    (_label, pieces) => {
      for (const piece of pieces) expect(sources).toContain(piece)
    }
  )

  it.each(Object.keys(UI_LABELS))("%s is one Help actually names", (label) => {
    expect(helpText).toContain(label)
  })

  it("does not use the labels that no longer exist", () => {
    for (const stale of ["About us", "Revisions", "Choose Add,", "Users and"])
      expect(helpText).not.toContain(stale)
    expect(helpText).not.toMatch(/\bUsers\b(?! &)/)
    expect(helpText).not.toMatch(/choose Add\b(?! testimonial)/)
  })
})
