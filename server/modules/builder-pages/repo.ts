import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm"

import type { DraftDocument } from "@/blocks/document"
import type { Sort } from "@/lib/schemas/api/list"
import type { Seo } from "@/lib/schemas/common"
import type { DbOrTx } from "@/server/db/client"
import { containsPattern } from "@/server/db/like"
import { builderPages, users } from "@/server/db/schema"
import type { VersionedPatch } from "@/server/lib/versioning"

const withEditor = {
  ...getTableColumns(builderPages),
  updatedByName: users.name,
}

export async function findBuilderPageForEdit(db: DbOrTx, id: string) {
  const [row] = await db
    .select(withEditor)
    .from(builderPages)
    .leftJoin(users, eq(users.id, builderPages.updatedBy))
    .where(eq(builderPages.id, id))
  return row ?? null
}
export type BuilderPageEditRow = NonNullable<
  Awaited<ReturnType<typeof findBuilderPageForEdit>>
>

export async function listBuilderPagesForAdmin(
  db: DbOrTx,
  opts: {
    q?: string
    /** custom (/p/…) or legal (/…) pages; legal ones list in footer order. */
    kind: "custom" | "legal"
    sort: Sort<"title" | "slug" | "updatedAt">
    page: number
    pageSize: number
  }
) {
  const pattern = opts.q ? containsPattern(opts.q) : null
  const kindWhere =
    opts.kind === "legal"
      ? isNotNull(builderPages.legalOrder)
      : isNull(builderPages.legalOrder)
  const where = pattern
    ? and(
        kindWhere,
        or(
          ilike(builderPages.title, pattern),
          ilike(builderPages.slug, pattern)
        )
      )
    : kindWhere
  const [{ total }] = await db
    .select({ total: count() })
    .from(builderPages)
    .where(where)
  const column =
    opts.sort.field === "title"
      ? builderPages.title
      : opts.sort.field === "slug"
        ? builderPages.slug
        : builderPages.updatedAt
  const rows = await db
    .select(withEditor)
    .from(builderPages)
    .leftJoin(users, eq(users.id, builderPages.updatedBy))
    .where(where)
    .orderBy(
      ...(opts.kind === "legal"
        ? [asc(builderPages.legalOrder)]
        : [opts.sort.dir === "asc" ? asc(column) : desc(column)]),
      asc(builderPages.slug)
    )
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
  return { rows, total }
}

export async function insertBuilderPage(
  db: DbOrTx,
  values: {
    slug: string
    title: string
    draft: DraftDocument
    createdBy: string
    updatedBy: string
    legalOrder?: number | null
  }
): Promise<string> {
  const [row] = await db
    .insert(builderPages)
    .values(values)
    .returning({ id: builderPages.id })
  return row.id
}

/** Applies `patch` and version + 1 only while `version` is current. */
export async function updateBuilderPageIfVersion(
  db: DbOrTx,
  id: string,
  version: number,
  patch: VersionedPatch<DraftDocument> & {
    slug?: string
    title?: string
    seo?: Seo
  }
): Promise<BuilderPageEditRow | null> {
  const [updated] = await db
    .update(builderPages)
    .set({ ...patch, version: version + 1 })
    .where(and(eq(builderPages.id, id), eq(builderPages.version, version)))
    .returning({ id: builderPages.id })
  return updated ? findBuilderPageForEdit(db, id) : null
}

/** Deletes only when `version` is current; false when stale or gone. */
export async function deleteBuilderPageIfVersion(
  db: DbOrTx,
  id: string,
  version: number
): Promise<boolean> {
  const rows = await db
    .delete(builderPages)
    .where(and(eq(builderPages.id, id), eq(builderPages.version, version)))
    .returning({ id: builderPages.id })
  return rows.length > 0
}

/** The next footer position: after every existing legal page. */
export async function nextLegalOrder(db: DbOrTx): Promise<number> {
  const [row] = await db
    .select({ last: max(builderPages.legalOrder) })
    .from(builderPages)
    .where(isNotNull(builderPages.legalOrder))
  return (row?.last ?? -1) + 1
}

/** Every legal page id in footer order (the reorder list must match it). */
export async function legalPageIds(db: DbOrTx): Promise<string[]> {
  const rows = await db
    .select({ id: builderPages.id })
    .from(builderPages)
    .where(isNotNull(builderPages.legalOrder))
    .orderBy(asc(builderPages.legalOrder), asc(builderPages.slug))
  return rows.map((r) => r.id)
}

/** legal_order = index, for `ids` in the given order (one statement). */
export async function applyLegalOrder(db: DbOrTx, ids: readonly string[]) {
  if (ids.length === 0) return
  const cases = sql.join(
    ids.map((id, index) => sql`when ${id}::uuid then ${index}::int`),
    sql` `
  )
  await db
    .update(builderPages)
    .set({ legalOrder: sql`case ${builderPages.id} ${cases} end` })
    .where(inArray(builderPages.id, [...ids]))
}

/** Published legal pages in footer order: just what the footer links need. */
export async function listPublishedLegalLinks(db: DbOrTx) {
  return db
    .select({ slug: builderPages.slug, title: builderPages.title })
    .from(builderPages)
    .where(
      and(isNotNull(builderPages.legalOrder), isNotNull(builderPages.published))
    )
    .orderBy(asc(builderPages.legalOrder), asc(builderPages.slug))
}

/** One page by slug (draft and published copies); null when unknown. */
export async function findBuilderPageBySlug(db: DbOrTx, slug: string) {
  const [row] = await db
    .select({
      id: builderPages.id,
      slug: builderPages.slug,
      title: builderPages.title,
      seo: builderPages.seo,
      legalOrder: builderPages.legalOrder,
      draft: builderPages.draft,
      published: builderPages.published,
    })
    .from(builderPages)
    .where(eq(builderPages.slug, slug))
  return row ?? null
}
