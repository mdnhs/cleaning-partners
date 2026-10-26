import "server-only"

import { DraftDocument, validateDocument } from "@/blocks/document"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import {
  BUILDER_ENTITY,
  type BuilderPageDto,
  type BuilderPageListItem,
  type BuilderPageListQuery,
  builderPath,
} from "@/lib/schemas/api/builder-pages"
import type { Paginated } from "@/lib/schemas/api/list"
import { getDb } from "@/server/db/client"
import type { Actor } from "@/server/lib/actor"
import { writeAudit } from "@/server/lib/audit"
import { invalidate, tag } from "@/server/lib/cache-tags"
import { AppError, conflict, forbidden, notFound } from "@/server/lib/errors"
import { clearMediaUsages, syncMediaUsages } from "@/server/lib/media-usages"
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
  type BuilderPageEditRow,
  deleteBuilderPageIfVersion,
  findBuilderPageForEdit,
  insertBuilderPage,
  listBuilderPagesForAdmin,
  updateBuilderPageIfVersion,
} from "./repo"

function assertCan(actor: Actor, req: PermissionRequest) {
  if (!hasPermission(actor.roles, req)) throw forbidden()
}

function toDto(row: BuilderPageEditRow): BuilderPageDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    path: builderPath(row.slug),
    seo: row.seo,
    ...versionedDto<DraftDocument>(row),
  }
}

const slugTaken = () =>
  new AppError("CONFLICT", "Another page already uses this address", {
    fieldErrors: { slug: ["Already used by another page"] },
  })

/**
 * Versioning adapter. Drafts are loose (DraftDocument); publishing also runs
 * validateDocument on the draft (authorizeWrite "publish"), so errors come
 * back as "blocks.<i>.<path>" after the stale-version check.
 */
export const builderStore: VersionedStore<DraftDocument, BuilderPageEditRow> = {
  entityType: BUILDER_ENTITY,
  label: "Page",
  schema: () => DraftDocument,
  find: (db, id) => findBuilderPageForEdit(db, id),
  update: (db, id, version, patch) =>
    updateBuilderPageIfVersion(db, id, version, patch),
  authorizeWrite: (_record, next, action) => {
    if (action !== "publish") return
    const result = validateDocument(next)
    if (!result.ok)
      throw new AppError("VALIDATION_FAILED", "Some blocks need attention", {
        fieldErrors: result.fieldErrors,
      })
  },
  tags: (row) => [tag.builderPages, tag.builderPage(row.slug)],
  mediaValues: (row) => [row.draft, row.published, { seo: row.seo }],
  present: (row) => toDto(row),
}

export async function listBuilderPagesAdmin(
  actor: Actor,
  query: BuilderPageListQuery
): Promise<Paginated<BuilderPageListItem>> {
  assertCan(actor, { page: ["read"] })
  const { rows, total } = await listBuilderPagesForAdmin(getDb(), {
    q: query.q || undefined,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  })
  return {
    items: rows.map((row) => {
      const dto: Partial<BuilderPageDto> = toDto(row)
      delete dto.draft
      delete dto.published
      return dto as BuilderPageListItem
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
  }
}

export async function getBuilderPageAdmin(
  actor: Actor,
  id: string
): Promise<BuilderPageDto> {
  assertCan(actor, { page: ["read"] })
  const row = await findBuilderPageForEdit(getDb(), id)
  if (!row) throw notFound("Page")
  return toDto(row)
}

/** New pages start as an unpublished draft (blank, or a copied `seed`). */
export async function createBuilderPage(
  actor: Actor,
  input: { slug: string; title: string; seed?: unknown }
): Promise<BuilderPageDto> {
  assertCan(actor, { page: ["create"] })
  const draft = validateContent(DraftDocument, input.seed ?? { blocks: [] })
  const db = getDb()
  try {
    const id = await db.transaction(async (tx) => {
      const newId = await insertBuilderPage(tx, {
        slug: input.slug,
        title: input.title,
        draft,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      await syncMediaUsages(tx, BUILDER_ENTITY, newId, draft)
      await writeAudit(tx, actor, {
        action: "builder-page.created",
        entityType: BUILDER_ENTITY,
        entityId: newId,
        diff: { slug: input.slug, title: input.title },
      })
      return newId
    })
    return toDto((await findBuilderPageForEdit(db, id))!)
  } catch (err) {
    if (pgErrorCode(err) === UNIQUE_VIOLATION) throw slugTaken()
    throw err
  }
}

export async function saveBuilderDraft(
  actor: Actor,
  id: string,
  input: { draft: unknown; version: number }
) {
  assertCan(actor, { page: ["update"] })
  return toDto(await saveDraft(getDb(), builderStore, actor, id, input))
}

export async function publishBuilderPage(
  actor: Actor,
  id: string,
  input: { version: number }
) {
  assertCan(actor, { page: ["publish"] })
  return toDto(await publish(getDb(), builderStore, actor, id, input))
}

export async function restoreBuilderPage(
  actor: Actor,
  id: string,
  input: { revisionId: string; version: number }
) {
  assertCan(actor, { page: ["update"] })
  return toDto(await restoreRevision(getDb(), builderStore, actor, id, input))
}

/** Title and address are columns, not draft content: the address changes the URL now. */
export async function changeBuilderMeta(
  actor: Actor,
  id: string,
  input: { title?: string; slug?: string; version: number }
) {
  assertCan(actor, { page: ["update"] })
  const db = getDb()
  try {
    const { before, after, moved } = await db.transaction(async (tx) => {
      const existing = await findBuilderPageForEdit(tx, id)
      if (!existing) throw notFound("Page")
      if (existing.version !== input.version) throw conflict(toDto(existing))
      const next = {
        title: input.title ?? existing.title,
        slug: input.slug ?? existing.slug,
      }
      const updated = await updateBuilderPageIfVersion(tx, id, input.version, {
        ...next,
        updatedBy: actor.userId,
      })
      if (!updated) {
        const current = await findBuilderPageForEdit(tx, id)
        if (!current) throw notFound("Page")
        throw conflict(toDto(current))
      }
      await writeAudit(tx, actor, {
        action: "builder-page.meta_changed",
        entityType: BUILDER_ENTITY,
        entityId: id,
        diff: {
          ...(next.slug !== existing.slug
            ? { slug: { from: existing.slug, to: next.slug } }
            : {}),
          ...(next.title !== existing.title
            ? { title: { from: existing.title, to: next.title } }
            : {}),
        },
      })
      const moved =
        existing.published !== null &&
        existing.slug !== next.slug &&
        (await recordMove(tx, actor, {
          from: builderPath(existing.slug),
          to: builderPath(next.slug),
          reason: "builder-page.slug_changed",
        }))
      return { before: existing, after: updated, moved }
    })
    invalidate(
      tag.builderPages,
      tag.builderPage(before.slug),
      tag.builderPage(after.slug),
      ...(moved ? [tag.redirects] : [])
    )
    return toDto(after)
  } catch (err) {
    if (pgErrorCode(err) === UNIQUE_VIOLATION) throw slugTaken()
    throw err
  }
}

/**
 * Deletes the page and its media usages. With `redirectHome`, a published
 * page's address is sent to the home page (301); otherwise it 404s.
 */
export async function deleteBuilderPage(
  actor: Actor,
  id: string,
  input: { version: number; redirectHome?: boolean }
) {
  assertCan(actor, { page: ["delete"] })
  const { removed, moved } = await getDb().transaction(async (tx) => {
    const existing = await findBuilderPageForEdit(tx, id)
    if (!existing) throw notFound("Page")
    if (existing.version !== input.version) throw conflict(toDto(existing))
    await clearMediaUsages(tx, BUILDER_ENTITY, id)
    if (!(await deleteBuilderPageIfVersion(tx, id, input.version))) {
      const current = await findBuilderPageForEdit(tx, id)
      if (!current) throw notFound("Page")
      throw conflict(toDto(current))
    }
    await writeAudit(tx, actor, {
      action: "builder-page.deleted",
      entityType: BUILDER_ENTITY,
      entityId: id,
      diff: { slug: existing.slug, redirectHome: !!input.redirectHome },
    })
    const moved =
      !!input.redirectHome &&
      existing.published !== null &&
      (await recordMove(tx, actor, {
        from: builderPath(existing.slug),
        to: "/",
        reason: "builder-page.deleted",
      }))
    return { removed: existing, moved }
  })
  invalidate(
    tag.builderPages,
    tag.builderPage(removed.slug),
    ...(moved ? [tag.redirects] : [])
  )
  return { ok: true as const }
}
