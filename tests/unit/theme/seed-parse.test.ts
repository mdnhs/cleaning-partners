import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { ThemeConfig } from "@/lib/theme/schema"

describe("migration 0010 theme seed", () => {
  it("parses with ThemeConfig and selects the cleaning-partners preset", () => {
    const sql = readFileSync("server/db/migrations/0010_theme.sql", "utf8")
    const json = /VALUES \('theme', '(\{.*?\})'::jsonb/.exec(sql)?.[1]
    expect(json).toBeDefined()
    const parsed = ThemeConfig.parse(JSON.parse(json!))
    expect(parsed.admin.preset).toBe("cleaning-partners")
    expect(parsed.site.preset).toBe("cleaning-partners")
  })
})
