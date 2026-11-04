import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNotNull,
  isNull,
  max,
  or,
  type SQL,
  sql,
} from "drizzle-orm"

import { irishToday } from "@/lib/careers/open"
import type { JobListStatus } from "@/lib/schemas/api/job-postings"
import type { Sort } from "@/lib/schemas/api/list"
import type { JobContent } from "@/lib/schemas/content/job"
import type { DbOrTx } from "@/server/db/client"
import { containsPattern } from "@/server/db/like"
import { jobPostings, users } from "@/server/db/schema"
import type { VersionedPatch } from "@/server/lib/versioning"

export function listJobRows(db: DbOrTx) {
  return db
    .select()
    .from(jobPostings)
    .orderBy(asc(jobPostings.sortOrder), asc(jobPostings.slug))
}

export async function findJobBySlug(db: DbOrTx, slug: string) {
  const [row] = await db
    .select()
    .from(jobPostings)
    .where(eq(jobPostings.slug, slug))
  return row ?? null
}

export async function findJobById(db: DbOrTx, id: string) {
  const [row] = await db
    .select()
    .from(jobPostings)
    .where(eq(jobPostings.id, id))
  return row ?? null
}

const withEditor = {
  ...getTableColumns(jobPostings),
  updatedByName: users.name,
}
const title = sql<string>`${jobPostings.draft}->>'title'`
const closingDate = sql<string | null>`${jobPostings.published}->>'closingDate'`

export async function findJobForEdit(db: DbOrTx, id: string) {
  const [row] = await db
    .select(withEditor)
    .from(jobPostings)
    .leftJoin(users, eq(users.id, jobPostings.updatedBy))
    .where(eq(jobPostings.id, id))
  return row ?? null
}
export type JobEditRow = NonNullable<Awaited<ReturnType<typeof findJobForEdit>>>

/** The status filter as SQL; "open" matches lib/careers/open.ts isOpenJob. */
function statusWhere(status: JobListStatus, now: Date): SQL | undefined {
  const today = irishToday(now)
  const open = and(
    isNotNull(jobPostings.published),
    isNull(jobPostings.closedAt),
    or(isNull(closingDate), sql`${closingDate} >= ${today}`)
  )
  if (status === "open") return open
  if (status === "draft") return isNull(jobPostings.published)
  if (status === "closed")
    return and(
      isNotNull(jobPostings.published),
      or(
        isNotNull(jobPostings.closedAt),
        and(isNotNull(closingDate), sql`${closingDate} < ${today}`)
      )
    )
  return undefined
}

/** Admin list: status filter, search title/slug, sort, paginate. */
export async function listJobsForAdmin(
  db: DbOrTx,
  opts: {
    q?: string
    status: JobListStatus
    now: Date
    sort: Sort<"sortOrder" | "title" | "updatedAt">
    page: number
    pageSize: number
  }
) {
  const pattern = opts.q ? containsPattern(opts.q) : null
  const where = and(
    statusWhere(opts.status, opts.now),
    pattern
      ? or(ilike(title, pattern), ilike(jobPostings.slug, pattern))
      : undefined
  )
  const [{ total }] = await db
    .select({ total: count() })
    .from(jobPostings)
    .where(where)
  const column =
    opts.sort.field === "title"
      ? title
      : opts.sort.field === "updatedAt"
        ? jobPostings.updatedAt
        : jobPostings.sortOrder
  const rows = await db
    .select(withEditor)
    .from(jobPostings)
    .leftJoin(users, eq(users.id, jobPostings.updatedBy))
    .where(where)
    .orderBy(
      opts.sort.dir === "asc" ? asc(column) : desc(column),
      asc(jobPostings.slug)
    )
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
  return { rows, total }
}

export async function nextJobSortOrder(db: DbOrTx): Promise<number> {
  const [row] = await db
    .select({ top: max(jobPostings.sortOrder) })
    .from(jobPostings)
  return (row?.top ?? -1) + 1
}

export async function insertJob(
  db: DbOrTx,
  values: {
    slug: string
    draft: JobContent
    sortOrder: number
    updatedBy: string
  }
): Promise<string> {
  const [row] = await db
    .insert(jobPostings)
    .values(values)
    .returning({ id: jobPostings.id })
  return row.id
}

export async function updateJobIfVersion(
  db: DbOrTx,
  id: string,
  version: number,
  patch: VersionedPatch<unknown> & { slug?: string; closedAt?: Date | null }
): Promise<JobEditRow | null> {
  const [updated] = await db
    .update(jobPostings)
    .set({
      ...patch,
      draft: patch.draft as JobContent | undefined,
      published: patch.published as JobContent | null | undefined,
      version: version + 1,
    })
    .where(and(eq(jobPostings.id, id), eq(jobPostings.version, version)))
    .returning({ id: jobPostings.id })
  return updated ? findJobForEdit(db, id) : null
}

/** Deletes only when `version` is current; false when stale or gone. */
export async function deleteJobIfVersion(
  db: DbOrTx,
  id: string,
  version: number
): Promise<boolean> {
  const rows = await db
    .delete(jobPostings)
    .where(and(eq(jobPostings.id, id), eq(jobPostings.version, version)))
    .returning({ id: jobPostings.id })
  return rows.length > 0
}
