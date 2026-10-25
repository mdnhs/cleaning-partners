import "server-only"

import {
  DEFAULT_THEME,
  ThemeConfig,
  type ThemeConfigValue,
} from "@/lib/theme/schema"
import { getDb } from "@/server/db/client"
import { findSettingsRow } from "@/server/modules/settings/repo"

/**
 * A missing value reads as the default theme (no <style>). A stored value
 * that no longer parses (manual edit, schema drift) reads as the default
 * too, with a warning so a broken theme shows up in the logs. Only for
 * display: the versioned store keeps the raw value, so publishing a
 * corrupt draft fails validation instead of publishing the default.
 */
export function readThemeOrDefault(value: unknown): ThemeConfigValue {
  if (value === null || value === undefined) return DEFAULT_THEME
  const parsed = ThemeConfig.safeParse(value)
  if (parsed.success) return parsed.data
  console.warn(
    "[theme] stored theme invalid; using default",
    parsed.error.issues
  )
  return DEFAULT_THEME
}

/**
 * The live theme (admin and public site). Never the draft.
 *
 * Task 3.5 (cacheComponents) restores SP's `"use cache"` +
 * `cacheLife("max")` + `cacheTag(tag.settings("theme"))` here; until then
 * it is a plain read, and the admin's AdminThemeStyle is dynamic anyway.
 */
export async function getPublishedTheme(): Promise<ThemeConfigValue> {
  const row = await findSettingsRow(getDb(), "theme")
  return readThemeOrDefault(row?.published)
}

// Phase 9 restores getPreviewableSiteTheme here (the draft for a verified
// previewer, else the published site theme); it needs server/modules/preview.
