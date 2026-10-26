import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
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
    sort: Sort<"title" | "slug" | "updatedAt">
    page: number
    pageSize: number
  }
) {
  const pattern = opts.q ? containsPattern(opts.q) : null
  const where = pattern
    ? or(ilike(builderPages.title, pattern), ilike(builderPages.slug, pattern))
    : undefined
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
      opts.sort.dir === "asc" ? asc(column) : desc(column),
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
