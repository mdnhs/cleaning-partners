import "server-only"

import { settingsSchemas } from "@/lib/schemas/settings"
import { type DbOrTx, getDb } from "@/server/db/client"
import type { SettingsKey, SettingsValue } from "@/server/lib/settings-store"

import { findSettingsRow } from "./repo"

// Phase 4 adds the admin read/save/publish/restore service to this file.

/**
 * Published value of a content settings key for server code that runs
 * outside the cached public queries (leads, jobs). null when unpublished
 * or when the stored value no longer matches its schema. Public readers
 * use the cached getPublishedSettings (settings/queries.ts) instead.
 */
export async function readPublishedSettings<K extends SettingsKey>(
  key: K,
  db: DbOrTx = getDb()
): Promise<SettingsValue<K> | null> {
  const row = await findSettingsRow(db, key)
  if (!row?.published) return null
  const parsed = settingsSchemas[key].safeParse(row.published)
  return parsed.success ? (parsed.data as SettingsValue<K>) : null
}
