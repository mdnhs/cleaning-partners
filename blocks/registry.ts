import { z } from "zod"

import { defineBlock } from "./define-block"
import { mediaRef, richText, text } from "./fields"

// Two-block stub so the block machinery (document, media refs) can run.
// Task 2 replaces this file with the full CP block library.

const heroPage = defineBlock({
  type: "hero.page",
  label: "Page hero",
  icon: "PanelTop",
  description: "Banner image with breadcrumb, title and intro.",
  schema: z.object({
    image: mediaRef,
    crumb: text(40),
    title: text(80),
    description: text(240),
  }),
  defaults: { crumb: "", title: "", description: "" },
  first: true,
  max: 1,
})

/** Text-block budget: the shared richText has no node or length caps. */
export const RICH_TEXT_MAX_NODES = 200
export const RICH_TEXT_MAX_CHARS = 50_000
const cappedRichText = richText
  .extend({ content: richText.shape.content.max(RICH_TEXT_MAX_NODES) })
  .refine(
    (doc) => JSON.stringify(doc).length <= RICH_TEXT_MAX_CHARS,
    "This text is too long for one block. Split it into several."
  )

const richtext = defineBlock({
  type: "richtext",
  label: "Text",
  icon: "Type",
  description: "Formatted text: headings, lists, quotes and images.",
  schema: z.object({ doc: cappedRichText }),
  defaults: {},
})

export const BLOCKS = [heroPage, richtext] as const

type AnyBlock = (typeof BLOCKS)[number]
export type BlockType = AnyBlock["type"]

export const BLOCK_TYPES = BLOCKS.map((block) => block.type) as [
  BlockType,
  ...BlockType[],
]

export const BLOCK_BY_TYPE = Object.fromEntries(
  BLOCKS.map((block) => [block.type, block])
) as { [B in AnyBlock as B["type"]]: B }

/** Stable across edits; the builder mints a random id. */
export const BlockId = z.string().regex(/^[A-Za-z0-9_-]{4,48}$/)

/** The section's id on the page (unique per page, blocks/document.ts). */
export const Anchor = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]{0,39}$/,
    "Use up to 40 lower-case letters, digits and hyphens, starting with a letter"
  )

/**
 * Section ids a shared section renders itself. Only the owning block may use
 * one as its anchor. The stub has no owning blocks yet (Task 2 fills this).
 */
export const RESERVED_ANCHORS: Readonly<Record<string, BlockType>> = {}

/** Why `type` may not use `anchor`, or null. */
export function reservedAnchorProblem(
  anchor: string,
  type: BlockType
): string | null {
  if (!Object.hasOwn(RESERVED_ANCHORS, anchor)) return null
  const owner = RESERVED_ANCHORS[anchor]
  return owner === type
    ? null
    : `"${anchor}" is kept for the ${BLOCK_BY_TYPE[owner].label} section`
}

const instance = <const T extends string, S extends z.ZodType>(block: {
  type: T
  schema: S
}) =>
  z.object({
    id: BlockId,
    type: z.literal(block.type),
    anchor: Anchor,
    hidden: z.boolean(),
    data: block.schema,
  })

export const BlockInstance = z.discriminatedUnion("type", [
  instance(heroPage),
  instance(richtext),
])
export type BlockInstance = z.infer<typeof BlockInstance>
export type BlockData<T extends BlockType> = Extract<
  BlockInstance,
  { type: T }
>["data"]

// Compile error if BLOCKS and BlockInstance drift apart.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
export const _blockTypesInSync: Exact<BlockInstance["type"], BlockType> = true
