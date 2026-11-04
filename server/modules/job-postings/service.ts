import "server-only"

import { isOpenJob } from "@/lib/careers/open"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import {
  JOB_ENTITY,
  type JobDto,
  type JobListItem,
  type JobListQuery,
  jobPath,
} from "@/lib/schemas/api/job-postings"
import type { Paginated } from "@/lib/schemas/api/list"
import { type JobContent, jobContent } from "@/lib/schemas/content/job"
import { getDb } from "@/server/db/client"
import type { Actor } from "@/server/lib/actor"
import { writeAudit } from "@/server/lib/audit"
import { invalidate, tag } from "@/server/lib/cache-tags"
import { AppError, conflict, forbidden, notFound } from "@/server/lib/errors"
import { pgErrorCode, UNIQUE_VIOLATION } from "@/server/lib/pg-errors"
import {
  publish,
  restoreRevision,
  saveDraft,
  validateContent,
  type VersionedStore,
  versionedDto,
} from "@/server/lib/versioning"
import { recordMove } from "@/server/modules/redirects/service"

import {
  deleteJobIfVersion,
  findJobForEdit,
  insertJob,
  type JobEditRow,
  listJobsForAdmin,
  nextJobSortOrder,
  updateJobIfVersion,
} from "./repo"

function assertCan(actor: Actor, req: PermissionRequest) {
  if (!hasPermission(actor.roles, req)) throw forbidden()
}

function toDto(row: JobEditRow, now = new Date()): JobDto {
  return {
    id: row.id,
    slug: row.slug,
    path: jobPath(row.slug),
    sortOrder: row.sortOrder,
    title: row.draft.title,
    closedAt: row.closedAt?.toISOString() ?? null,
    open: isOpenJob(
      {
        published: row.published,
        closedAt: row.closedAt,
        closingDate: row.published?.closingDate ?? null,
      },
      now
    ),
    ...versionedDto<JobContent>(row),
  }
}

const slugTaken = () =>
  new AppError("CONFLICT", "Another job already uses this address", {
    fieldErrors: { slug: ["Already used by another job"] },
  })

const tagsOf = (slug: string) => [tag.jobs, tag.job(slug)]

/** Versioning adapter for job postings (id = row id; tags = list + detail). */
export const jobStore: VersionedStore<JobContent, JobEditRow> = {
  entityType: JOB_ENTITY,
  label: "Job",
  schema: () => jobContent,
  find: (db, id) => findJobForEdit(db, id),
  update: (db, id, version, patch) =>
    updateJobIfVersion(db, id, version, patch),
  tags: (row) => tagsOf(row.slug),
  mediaValues: () => [],
  present: (row) => toDto(row),
}

export async function listJobsAdmin(
  actor: Actor,
  query: JobListQuery,
  now = new Date()
): Promise<Paginated<JobListItem>> {
  assertCan(actor, { job: ["read"] })
  const { rows, total } = await listJobsForAdmin(getDb(), {
    q: query.q || undefined,
    status: query.status,
    now,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  })
  return {
    items: rows.map((row) => {
      const dto: Partial<JobDto> = toDto(row, now)
      delete dto.draft
      delete dto.published
      return dto as JobListItem
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  }
}

export async function getJobAdmin(actor: Actor, id: string): Promise<JobDto> {
  assertCan(actor, { job: ["read"] })
  const row = await findJobForEdit(getDb(), id)
  if (!row) throw notFound("Job")
  return toDto(row)
}

/** New jobs start as an unpublished draft at the end of the list. */
export async function createJob(
  actor: Actor,
  input: { slug: string; draft: unknown }
): Promise<JobDto> {
  assertCan(actor, { job: ["create"] })
  const draft = validateContent(jobContent, input.draft)
  const db = getDb()
  try {
    const id = await db.transaction(async (tx) => {
      const newId = await insertJob(tx, {
        slug: input.slug,
        draft,
        sortOrder: await nextJobSortOrder(tx),
        updatedBy: actor.userId,
      })
      await writeAudit(tx, actor, {
        action: "job.created",
        entityType: JOB_ENTITY,
        entityId: newId,
        diff: { slug: input.slug },
      })
      return newId
    })
    return toDto((await findJobForEdit(db, id))!)
  } catch (err) {
    if (pgErrorCode(err) === UNIQUE_VIOLATION) throw slugTaken()
    throw err
  }
}

export async function saveJobDraft(
  actor: Actor,
  id: string,
  input: { draft: unknown; version: number }
) {
  assertCan(actor, { job: ["update"] })
  return toDto(await saveDraft(getDb(), jobStore, actor, id, input))
}

export async function publishJob(
  actor: Actor,
  id: string,
  input: { version: number }
) {
  assertCan(actor, { job: ["publish"] })
  return toDto(await publish(getDb(), jobStore, actor, id, input))
}

export async function restoreJob(
  actor: Actor,
  id: string,
  input: { revisionId: string; version: number }
) {
  assertCan(actor, { job: ["update"] })
  return toDto(await restoreRevision(getDb(), jobStore, actor, id, input))
}

/**
 * Close (the role is filled) or reopen a job: a column, not draft content,
 * so it takes effect on the site at once. Needs publish rights.
 */
async function setClosed(
  actor: Actor,
  id: string,
  input: { version: number },
  closed: boolean
) {
  assertCan(actor, { job: ["publish"] })
  const row = await getDb().transaction(async (tx) => {
    const updated = await updateJobIfVersion(tx, id, input.version, {
      closedAt: closed ? new Date() : null,
      updatedBy: actor.userId,
    })
    if (!updated) {
      const current = await findJobForEdit(tx, id)
      if (!current) throw notFound("Job")
      throw conflict(toDto(current))
    }
    await writeAudit(tx, actor, {
      action: closed ? "job.closed" : "job.reopened",
      entityType: JOB_ENTITY,
      entityId: id,
    })
    return updated
  })
  invalidate(...tagsOf(row.slug))
  return toDto(row)
}

export const closeJob = (
  actor: Actor,
  id: string,
  input: { version: number }
) => setClosed(actor, id, input, true)

export const reopenJob = (
  actor: Actor,
  id: string,
  input: { version: number }
) => setClosed(actor, id, input, false)

/** The address is a column, not draft content: it changes the public URL now. */
export async function changeJobSlug(
  actor: Actor,
  id: string,
  input: { slug: string; version: number }
) {
  assertCan(actor, { job: ["update"] })
  const db = getDb()
  try {
    const { before, after, moved } = await db.transaction(async (tx) => {
      const existing = await findJobForEdit(tx, id)
      if (!existing) throw notFound("Job")
      const updated = await updateJobIfVersion(tx, id, input.version, {
        slug: input.slug,
        updatedBy: actor.userId,
      })
      if (!updated) {
        const current = await findJobForEdit(tx, id)
        if (!current) throw notFound("Job")
        throw conflict(toDto(current))
      }
      await writeAudit(tx, actor, {
        action: "job.slug_changed",
        entityType: JOB_ENTITY,
        entityId: id,
        diff: { from: existing.slug, to: input.slug },
      })
      const moved =
        existing.published !== null &&
        existing.slug !== input.slug &&
        (await recordMove(tx, actor, {
          from: jobPath(existing.slug),
          to: jobPath(input.slug),
          reason: "job.slug_changed",
        }))
      return { before: existing, after: updated, moved }
    })
    invalidate(
      ...tagsOf(before.slug),
      tag.job(after.slug),
      ...(moved ? [tag.redirects] : [])
    )
    return toDto(after)
  } catch (err) {
    if (pgErrorCode(err) === UNIQUE_VIOLATION) throw slugTaken()
    throw err
  }
}

export async function deleteJob(
  actor: Actor,
  id: string,
  input: { version: number }
) {
  assertCan(actor, { job: ["delete"] })
  const { removed, moved } = await getDb().transaction(async (tx) => {
    const existing = await findJobForEdit(tx, id)
    if (!existing) throw notFound("Job")
    if (existing.version !== input.version) throw conflict(toDto(existing))
    if (!(await deleteJobIfVersion(tx, id, input.version))) {
      const current = await findJobForEdit(tx, id)
      if (!current) throw notFound("Job")
      throw conflict(toDto(current))
    }
    await writeAudit(tx, actor, {
      action: "job.deleted",
      entityType: JOB_ENTITY,
      entityId: id,
      diff: { slug: existing.slug },
    })
    const moved =
      existing.published !== null &&
      (await recordMove(tx, actor, {
        from: jobPath(existing.slug),
        to: "/careers",
        reason: "job.deleted",
      }))
    return { removed: existing, moved }
  })
  invalidate(...tagsOf(removed.slug), ...(moved ? [tag.redirects] : []))
  return { ok: true as const }
}
