import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ogCard } from "@/lib/seo/og-card"

const base = {
  siteName: "Cleaning Partners Ltd.",
  origin: "https://www.cleaningpartners.ie",
}

describe("OG card model", () => {
  it("labels services and articles; pages show the site name", () => {
    expect(
      ogCard({ ...base, kind: "service", title: "Medical Cleaning" })
    ).toEqual({
      eyebrow: "Service",
      title: "Medical Cleaning",
      titleSize: 80,
      siteName: "Cleaning Partners Ltd.",
      host: "www.cleaningpartners.ie",
    })
    expect(ogCard({ ...base, kind: "article", title: "x" }).eyebrow).toBe(
      "Article"
    )
    expect(ogCard({ ...base, kind: "page", title: "About Us" }).eyebrow).toBe(
      "Cleaning Partners Ltd."
    )
  })

  it("collapses whitespace, shrinks long titles and truncates at 110 characters", () => {
    expect(ogCard({ ...base, kind: "page", title: "A\n  B" }).title).toBe("A B")
    expect(
      ogCard({ ...base, kind: "page", title: "x".repeat(40) }).titleSize
    ).toBe(68)
    const long = ogCard({ ...base, kind: "page", title: "word ".repeat(40) })
    expect([...long.title].length).toBeLessThanOrEqual(110)
    expect(long.title.endsWith("…")).toBe(true)
    expect(long.titleSize).toBe(56)
  })

  it("clamps a long site name in the footer and the page eyebrow", () => {
    const card = ogCard({
      ...base,
      kind: "page",
      title: "About",
      siteName: "Cleaning  Partners ".repeat(5),
    })
    expect([...card.siteName].length).toBeLessThanOrEqual(40)
    expect(card.siteName.endsWith("…")).toBe(true)
    expect(card.siteName).toMatch(/^Cleaning Partners Cleaning/)
    expect(card.eyebrow).toBe(card.siteName)
  })
})

const root = process.cwd()
const css = readFileSync(join(root, "app/globals.css"), "utf8")
const token = (name: string) =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]
const card = readFileSync(join(root, "app/og/[kind]/[slug]/card.tsx"), "utf8")
const constant = (name: string) =>
  new RegExp(`const ${name} = "(#[0-9a-fA-F]{6})"`).exec(card)?.[1]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe("OG card colours (R8-5)", () => {
  it("equal the site tokens in app/globals.css", () => {
    expect(token("brand")).toBeDefined()
    expect(constant("BRAND")?.toLowerCase()).toBe(token("brand")?.toLowerCase())
    expect(constant("NAVY")?.toLowerCase()).toBe(token("navy")?.toLowerCase())
    expect(constant("NAVY_DARK")?.toLowerCase()).toBe(
      token("navy-dark")?.toLowerCase()
    )
  })

  it("never use the sister-site palette under app/og or lib/seo", () => {
    for (const file of [...files("app/og"), ...files("lib/seo")]) {
      const text = readFileSync(join(root, file), "utf8").toLowerCase()
      for (const hex of ["0d1b36", "67bd31", "eef6e8"].map((h) => `#${h}`))
        expect(text, `${file} ${hex}`).not.toContain(hex)
    }
  })
})
