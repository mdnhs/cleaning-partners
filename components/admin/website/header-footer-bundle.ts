import { z } from "zod"

import type {
  EditorMeta,
  FieldGroupMeta,
  FieldMeta,
} from "@/components/admin/schema-form/editor-meta"
import { settingsEditorMeta } from "@/components/admin/settings/settings-meta"
import { api, unwrap } from "@/lib/api-client"
import { isDeepEqual } from "@/lib/json"
import type { SettingsDto } from "@/lib/schemas/api/settings"
import { settingsSchemas } from "@/lib/schemas/settings"

/**
 * Header & footer as one form with two tabs: `header` is the navigation
 * settings, `footer` the footer settings. They stay two stored records; this
 * loads both, splits a save back into the one that changed and publishes
 * both with the editor's Publish (the navigation record's version is the
 * editor's).
 */
const PARTS = [
  { form: "header", key: "navigation", label: "Header" },
  { form: "footer", key: "footer", label: "Footer" },
] as const
type Part = (typeof PARTS)[number]

export const headerFooterSchema = z.object({
  header: settingsSchemas.navigation,
  footer: settingsSchemas.footer,
})

export const headerFooterMeta: EditorMeta = (() => {
  const fields: Record<string, FieldMeta> = {}
  const groups: Record<string, FieldGroupMeta[]> = {}
  for (const part of PARTS) {
    const own = settingsEditorMeta[part.key]
    fields[part.form] = { label: part.label, section: true }
    for (const [path, meta] of Object.entries(own.fields))
      fields[`${part.form}.${path}`] = meta
    for (const [path, list] of Object.entries(own.groups ?? {}))
      groups[path ? `${part.form}.${path}` : part.form] = list
  }
  return { fields, groups }
})()

export function createHeaderFooterBundle() {
  const latest = {} as Record<Part["form"], SettingsDto>
  const saved = {} as Record<Part["form"], unknown>

  const merged = (): SettingsDto => {
    const primary = latest.header
    return {
      ...primary,
      draft: { header: latest.header.draft, footer: latest.footer.draft },
      published:
        primary.published === null
          ? null
          : {
              header: latest.header.published ?? latest.header.draft,
              footer: latest.footer.published ?? latest.footer.draft,
            },
      dirty: PARTS.some((p) => latest[p.form].dirty),
    }
  }
  const adopt = (part: Part, dto: SettingsDto) => {
    latest[part.form] = dto
    saved[part.form] = dto.draft
  }

  return {
    async load(): Promise<SettingsDto> {
      const dtos = await Promise.all(
        PARTS.map((p) =>
          unwrap(api.settings[":key"].$get({ param: { key: p.key } }))
        )
      )
      PARTS.forEach((p, i) => adopt(p, dtos[i]))
      return merged()
    },

    async saveDraft(draft: unknown, version: number): Promise<SettingsDto> {
      const value = draft as Record<Part["form"], unknown>
      for (const part of PARTS) {
        // A save at another version is an overwrite after a conflict: send it.
        const forced =
          part.form === "header" && version !== latest.header.version
        if (!forced && isDeepEqual(value[part.form], saved[part.form])) continue
        const dto = await unwrap(
          api.settings[":key"].draft.$put({
            param: { key: part.key },
            json: {
              draft: value[part.form],
              version:
                part.form === "header" ? version : latest[part.form].version,
            },
          })
        )
        latest[part.form] = dto
        saved[part.form] = value[part.form]
      }
      return merged()
    },

    async publish(version: number): Promise<SettingsDto> {
      for (const part of PARTS) {
        const dto = latest[part.form]
        if (part.form === "footer" && !dto.dirty && dto.published) continue
        adopt(
          part,
          await unwrap(
            api.settings[":key"].publish.$post({
              param: { key: part.key },
              json: {
                version: part.form === "header" ? version : dto.version,
              },
            })
          )
        )
      }
      return merged()
    },

    async restore(revisionId: string, version: number): Promise<SettingsDto> {
      adopt(
        PARTS[0],
        await unwrap(
          api.settings[":key"].restore.$post({
            param: { key: "navigation" },
            json: { revisionId, version },
          })
        )
      )
      return merged()
    },
  }
}
