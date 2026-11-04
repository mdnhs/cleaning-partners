import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cache } from "react"

import { BlockInstance } from "@/blocks/registry"
import { SLUG_PATTERN, type Seo } from "@/lib/schemas/common"
import { getDb } from "@/server/db/client"
import { tag } from "@/server/lib/cache-tags"
import { previewerCan } from "@/server/modules/preview/guard"
import { isPublishedSlug } from "@/server/modules/redirects/repo"

import { findBuilderPageBySlug, listPublishedLegalLinks } from "./repo"

/** builder_pages.slug is at most 60 characters (check constraint). */
const MAX_SLUG = 60

export type BuilderPageRecord = {
  id: string
  slug: string
  title: string
  /** true = a legal page, served at /<slug> instead of /p/<slug>. */
  legal: boolean
  seo: Seo
  /** Only blocks that pass their full block schema, in order. */
  blocks: BlockInstance[]
}

/**
 * Keeps the blocks that pass their own full schema (the layout rule of the
 * services block included). A draft is only loosely typed, and a block the
 * renderer cannot build (blockView throws on a services layout without
 * content) must never reach it: the page shows the rest instead of a 500.
 */
export function renderableBlocks(blocks: readonly unknown[]): BlockInstance[] {
  return blocks.flatMap((block) => {
    const parsed = BlockInstance.safeParse(block)
    return parsed.success ? [parsed.data] : []
  })
}

type Row = NonNullable<Awaited<ReturnType<typeof findBuilderPageBySlug>>>

function toRecord(
  row: Row,
  doc: Row["draft"] | null
): BuilderPageRecord | null {
  if (!doc) return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    legal: row.legalOrder !== null,
    seo: row.seo,
    blocks: renderableBlocks(doc.blocks),
  }
}

/** One published page; null for an unknown or unpublished slug. */
export async function getPublishedBuilderPage(
  slug: string
): Promise<BuilderPageRecord | null> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.builderPages, tag.builderPage(slug))
  const row = await findBuilderPageBySlug(getDb(), slug)
  return row ? toRecord(row, row.published) : null
}

/** A page of the other kind than the address asked for does not exist there. */
const ofKind = (page: BuilderPageRecord | null, legal: boolean) =>
  page && page.legal === legal ? page : null

const wellFormed = (slug: string) =>
  slug.length <= MAX_SLUG && SLUG_PATTERN.test(slug)

/**
 * The page a visitor asked for. A malformed slug never reaches the database
 * or the cache. A verified previewer holding page:read sees the working copy
 * (published or not, invalid blocks dropped); everyone else the published one.
 */
async function pageForRequest(
  slug: string,
  legal: boolean
): Promise<BuilderPageRecord | null> {
  if (!wellFormed(slug)) return null
  if (await previewerCan({ page: ["read"] })) {
    const row = await findBuilderPageBySlug(getDb(), slug)
    return ofKind(row ? toRecord(row, row.draft) : null, legal)
  }
  return ofKind(await getPublishedBuilderPage(slug), legal)
}

/** /p/<slug>: custom pages only (a legal page is not served under /p). */
export const getBuilderPageForRequest: (
  slug: string
) => Promise<BuilderPageRecord | null> = cache((slug: string) =>
  pageForRequest(slug, false)
)

/** /<slug>: legal pages only. */
export const getLegalPageForRequest: (
  slug: string
) => Promise<BuilderPageRecord | null> = cache((slug: string) =>
  pageForRequest(slug, true)
)

export type LegalLink = { label: string; href: string }

/**
 * The footer's legal links: published legal pages in the admin's order. A
 * database failure is thrown, never cached as "no pages" (the caller decides
 * what the footer shows without them).
 */
export async function listLegalLinks(): Promise<LegalLink[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.legalPages)
  const rows = await listPublishedLegalLinks(getDb())
  return rows.map((r) => ({ label: r.title, href: `/${r.slug}` }))
}

/** True when `slug` names a published custom builder page (a well-formed slug only). */
export async function isPublishedBuilderSlug(slug: string): Promise<boolean> {
  return wellFormed(slug) && (await isPublishedSlug(getDb(), "builder", slug))
}
