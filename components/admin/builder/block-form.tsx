"use client"

import { Info } from "lucide-react"
import { type ComponentProps, useMemo, useState } from "react"
import type { z } from "zod"

import { FormCard } from "@/components/admin/form/form-ui"
import type {
  EditorMeta,
  FieldGroupMeta,
  FieldMeta,
} from "@/components/admin/schema-form/editor-meta"
import { emptyValue } from "@/components/admin/schema-form/empty-value"
import { unwrapSchema } from "@/components/admin/schema-form/resolve-widget"
import { SchemaForm } from "@/components/admin/schema-form/schema-form"
import { BLOCK_BY_TYPE, type BlockType } from "@/blocks/registry"
import { aboutEditorMeta } from "@/templates/about/editor-meta"
import { homeEditorMeta } from "@/templates/home/editor-meta"
import { servicesEditorMeta } from "@/templates/services/editor-meta"

import { type DraftBlock, fieldLabel } from "./builder-state"

/**
 * The fixed template's editor meta, re-rooted onto a block's data: the
 * subtree at `from` becomes the block's root ("hero.title" → "title"), or
 * moves to `to` ("services.title" → "intro.title"). A block field is then
 * labelled exactly as in the page editor (R10-4).
 */
function reroot(meta: EditorMeta, from: string, to: string): EditorMeta {
  const join = (rest: string) => [to, rest].filter(Boolean).join(".")
  const fields: Record<string, FieldMeta> = {}
  for (const [key, value] of Object.entries(meta.fields)) {
    if (key === from) {
      // The section's own label and help head the block's group, if it has one.
      if (to) fields[to] = value
    } else if (key.startsWith(`${from}.`))
      fields[join(key.slice(from.length + 1))] = value
  }
  const groups: Record<string, FieldGroupMeta[]> = {}
  for (const [key, value] of Object.entries(meta.groups ?? {})) {
    if (key === from) groups[to] = value
    else if (key.startsWith(`${from}.`))
      groups[join(key.slice(from.length + 1))] = value
  }
  return { fields, groups }
}

const merge = (...parts: EditorMeta[]): EditorMeta => ({
  fields: Object.assign({}, ...parts.map((p) => p.fields)),
  groups: Object.assign({}, ...parts.map((p) => p.groups ?? {})),
})

/** Per-block meta from the fixed templates, then the hints only blocks need. */
const BLOCK_TEMPLATE_META: Partial<Record<BlockType, () => EditorMeta>> = {
  hero: () => reroot(homeEditorMeta, "hero", ""),
  "hero.page": () =>
    merge(reroot(servicesEditorMeta, "hero", ""), {
      fields: {
        image: { label: "Banner image", aspect: "video" },
      },
    }),
  ourStory: () => reroot(aboutEditorMeta, "story", ""),
  stats: () => ({
    fields: {
      items: aboutEditorMeta.fields.stats,
    },
  }),
  services: () =>
    merge(
      reroot(homeEditorMeta, "services", "intro"),
      reroot(servicesEditorMeta, "grid", "grid")
    ),
  blog: () => reroot(homeEditorMeta, "blog", ""),
}

const BLOCK_FIELD_META: Partial<Record<BlockType, Record<string, FieldMeta>>> =
  {
    services: {
      layout: {
        label: "Layout",
        widget: "radio",
        options: [
          { value: "intro", label: "Intro with highlights" },
          { value: "grid", label: "Card grid" },
        ],
      },
    },
    blog: {
      count: { label: "Posts shown", help: "The latest published articles." },
    },
    contact: {
      title: {
        label: "Title",
        help: "Leave empty for the section's own title.",
      },
    },
    // The capped rich text is not the shared schema object (resolve-widget
    // matches by identity), so the widget is named here.
    richtext: { doc: { label: "Text", widget: "richText" } },
  }

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] }

type AnySchema = z.ZodType
const typeOf = (schema: AnySchema) =>
  (schema as unknown as { def: { type: string } }).def.type

/** The `services` block's two groups; `layout` says which one is shown. */
const SERVICES_LAYOUTS = ["intro", "grid"] as const
type ServicesLayout = (typeof SERVICES_LAYOUTS)[number]

const layoutOf = (data: unknown): ServicesLayout | null => {
  const layout = isRecord(data) ? data.layout : undefined
  return layout === "intro" || layout === "grid" ? layout : null
}

/**
 * Meta for every field of a block schema: labels from the fixed template's
 * editor meta (re-rooted), BLOCK_FIELD_LABELS for what only blocks have,
 * then per-block hints. SchemaForm has no unions, so the services block's
 * inactive layout group is `hidden`; its value stays as stored.
 */
export function blockEditorMeta(type: BlockType, data?: unknown): EditorMeta {
  const fields: Record<string, FieldMeta> = {}
  const walk = (schema: AnySchema, path: string) => {
    const { inner } = unwrapSchema(schema)
    if (typeOf(inner) === "object") {
      const shape = (inner as z.ZodObject).shape as Record<string, AnySchema>
      for (const [key, child] of Object.entries(shape)) {
        const at = path ? `${path}.${key}` : key
        fields[at] = { label: fieldLabel(key) }
        walk(child, at)
      }
    } else if (typeOf(inner) === "array")
      walk((inner as z.ZodArray<AnySchema>).element, `${path}[]`)
  }
  walk(BLOCK_BY_TYPE[type].schema, "")
  const template = BLOCK_TEMPLATE_META[type]?.() ?? { fields: {} }
  for (const [key, meta] of Object.entries(template.fields))
    fields[key] = { ...fields[key], ...meta }
  // Shared-section blocks always use the shared copy (a literal true):
  // nothing to edit here.
  if (fields.useShared) fields.useShared = { ...fields.useShared, hidden: true }
  for (const [key, meta] of Object.entries(BLOCK_FIELD_META[type] ?? {}))
    fields[key] = { ...fields[key], ...meta }
  if (type === "services") {
    const layout = layoutOf(data) ?? "grid"
    for (const group of SERVICES_LAYOUTS)
      if (group !== layout) fields[group] = { ...fields[group], hidden: true }
  }
  return { fields, groups: template.groups }
}

/** True when the block has no field of its own (it renders a shared section). */
export function isSharedOnly(type: BlockType): boolean {
  const shape = (BLOCK_BY_TYPE[type].schema as unknown as z.ZodObject).shape
  return Object.keys(shape).every((key) => key === "useShared")
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** The services group of `layout`, blank when the draft has none yet. */
function withLayoutGroup(
  value: Record<string, unknown>
): Record<string, unknown> {
  const layout = layoutOf(value)
  if (!layout || value[layout] !== null) return value
  const schema = BLOCK_BY_TYPE.services.schema as unknown as z.ZodObject
  const { inner } = unwrapSchema(schema.shape[layout] as AnySchema)
  return { ...value, [layout]: emptyValue(inner) }
}

/** The form's starting value: the block's data over a blank of its schema. */
function formValue(block: DraftBlock): Record<string, unknown> {
  const blank = emptyValue(BLOCK_BY_TYPE[block.type].schema)
  const value = { ...(isRecord(blank) ? blank : {}), ...block.data }
  if (block.type === "richtext" && !isRecord(value.doc)) value.doc = EMPTY_DOC
  return block.type === "services" ? withLayoutGroup(value) : value
}

/**
 * The selected block's content: SchemaForm over the block's schema, with
 * the fixed templates' labels. Every change goes to `onChange` (valid or
 * not: autosave keeps drafts; publish runs the full check). `errors` are
 * the block's publish errors keyed by data path ("_root" for the block),
 * see blockErrors. Bump `resetKey` whenever the document is replaced
 * (restore, conflict reload, discard): the form then reloads `block.data`
 * instead of emitting its stale copy on the next keystroke.
 */
export function BlockForm({
  block,
  onChange,
  errors,
  readOnly,
  resetKey,
  onFieldFocus,
}: {
  block: DraftBlock
  onChange(data: unknown): void
  errors: Record<string, string[]>
  readOnly: boolean
  resetKey?: string | number
  /** Assistant hook (R10-13): the focused text field. */
  onFieldFocus?: ComponentProps<typeof SchemaForm>["onFieldFocus"]
}) {
  const def = BLOCK_BY_TYPE[block.type]
  const layout = block.type === "services" ? layoutOf(block.data) : null
  const meta = useMemo(
    () => blockEditorMeta(block.type, { layout }),
    [block.type, layout]
  )
  // Switching the services layout reloads the form from the filled group.
  const [layoutResets, setLayoutResets] = useState(0)
  if (isSharedOnly(block.type))
    return (
      <FormCard id={`block-${block.id}-shared`} title={def.label}>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {def.description} It shows the site-wide copy from Site settings, so
            it has nothing to fill in here.
          </span>
        </p>
        {errors._root?.length ? (
          <p className="text-sm text-destructive">{errors._root[0]}</p>
        ) : null}
      </FormCard>
    )
  function change(data: unknown) {
    if (block.type === "services" && isRecord(data)) {
      const next = layoutOf(data)
      if (next && next !== layout) {
        onChange(withLayoutGroup(data))
        setLayoutResets((n) => n + 1)
        return
      }
    }
    onChange(data)
  }
  // SchemaForm reads `value` once; keyed by block id, another block starts
  // a fresh form, and `resetKey` reloads this one after a replace.
  return (
    <SchemaForm
      key={block.id}
      resetKey={`${resetKey ?? 0}:${layoutResets}`}
      schema={def.schema as unknown as z.ZodObject}
      meta={meta}
      value={formValue(block)}
      onChange={change}
      onFieldFocus={onFieldFocus}
      errors={errors}
      disabled={readOnly}
      idPrefix={`sf-b${block.id.slice(0, 8)}`}
    />
  )
}
