import { globSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

// R9-19: the design gallery is CP content. No SP services or palette, and no
// security wording (the `account?tab=security` href is the account's Security
// tab, so it is the one allowed hit).
const FORBIDDEN = [
  new RegExp(["Security", "Partners"].join("\\s*"), "i"),
  /Static Guarding|Event Security|Alarm Response|Mobile Patrol|Key Holding/i,
  /guard|patrol|keyholder|alarm/i,
  new RegExp(
    `#(${["3673", "18"].join("")}|${["67bd", "31"].join("")})\\b`,
    "i"
  ),
  /security/i,
]
const ALLOWED = ["/admin/account?tab=security"]

const files = [
  ...globSync("components/admin/design/**/*.{ts,tsx}"),
  "app/(admin)/admin/(panel)/design/page.tsx",
]

describe("design gallery branding", () => {
  it("finds the gallery files", () => {
    expect(files.length).toBeGreaterThanOrEqual(3)
  })

  it.each(files)("%s carries no SP or security wording", (file) => {
    let src = readFileSync(file, "utf8")
    for (const ok of ALLOWED) src = src.split(ok).join("")
    for (const re of FORBIDDEN) expect(src, String(re)).not.toMatch(re)
  })
})
