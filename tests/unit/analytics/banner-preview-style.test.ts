import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { BANNER_PREVIEW_STYLE } from "@/lib/analytics/banner-preview-style"
import { SITE_TOKENS } from "@/lib/theme/tokens"

const globals = readFileSync(
  path.join(import.meta.dirname, "../../../app/globals.css"),
  "utf8"
)

describe("BANNER_PREVIEW_STYLE (admin consent preview)", () => {
  it("carries every named site token's colour from app/globals.css, unchanged", () => {
    // Only the named site tokens: another --color-* in the stylesheet (a
    // non-brand variable) must not fail this test.
    const all = Object.fromEntries(
      [...globals.matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{3,8});/gi)].map(
        ([, name, value]) => [name, value]
      )
    )
    const named = Object.fromEntries(
      SITE_TOKENS.map((token) => [`--color-${token}`, all[`--color-${token}`]])
    )
    expect(Object.values(named).every(Boolean)).toBe(true)
    expect(SITE_TOKENS.length).toBeGreaterThanOrEqual(14)
    expect(BANNER_PREVIEW_STYLE).toEqual(named)
  })
})
