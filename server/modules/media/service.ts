import "server-only"

import { createHash } from "node:crypto"

import { uuidv7 } from "uuidv7"

import {
  GROWTH_SETTINGS,
  isGrowthSettingsKey,
} from "@/lib/admin/growth-settings"
import { PAGE_LABELS } from "@/lib/admin/page-labels"
import {
  isEditableSettingsKey,
  SETTINGS_ENTRIES,
} from "@/lib/admin/settings-keys"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import { stripHiddenChars } from "@/lib/hidden-chars"
import type { Paginated } from "@/lib/schemas/api/list"
import {
  cleanAltText,
  isLottieMime,
  MAX_LOTTIE_BYTES,
  MAX_UPLOAD_BYTES,
  MEDIA_ALT_MAX,
  type MediaItem,
  type MediaListQuery,
  type MediaUpdateInput,
  type MediaUsage,
} from "@/lib/schemas/api/media"
import { type DbOrTx, getDb } from "@/server/db/client"
import type { Actor } from "@/server/lib/actor"
import { writeAudit } from "@/server/lib/audit"
import { invalidate, tag } from "@/server/lib/cache-tags"
import {
  ImageReadError,
  type ImageInfo,
  inspectImage,
  isRasterMime,
  reencodeImage,
} from "@/server/lib/image"
import {
  LottieError,
  type LottieInfo,
  validateDotLottie,
  validateLottieJson,
} from "@/server/lib/lottie"
import {
  isLottieUpload,
  type LottieUploadMime,
  sniffMime,
  UPLOAD_TYPES,
  type UploadMime,
} from "@/server/lib/media-sniff"
import { AppError, forbidden, notFound } from "@/server/lib/errors"
import { FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/server/lib/pg-errors"
import { getStorage, type StorageName, storageFor } from "@/server/lib/storage"
import { mediaUrl } from "@/server/lib/storage/paths"
import type { ByteRange, StoredStream } from "@/server/lib/storage/types"
import { sanitizeSvg, SvgSanitizeError } from "@/server/lib/svg-sanitize"
import {
  findJobByKey,
  insertKeyedJobIfAbsent,
} from "@/server/modules/jobs/repo"

import {
  deleteMediaRow,
  findMediaById,
  findServableMedia,
  insertMediaRow,
  listMediaRows,
  listMediaUsages,
  lockMediaRow,
  updateMediaRow,
  usageTargets,
} from "./repo"

type MediaRow = NonNullable<Awaited<ReturnType<typeof findMediaById>>>

export function toItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: mediaUrl(row),
    alt: row.alt,
    mime: row.mime,
    width: row.width,
    height: row.height,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    originalName: row.originalName,
    driver: row.driver,
    focalX: row.focalX,
    focalY: row.focalY,
    isDecorative: row.isDecorative,
    caption: row.caption,
    createdBy: row.createdBy,
  }
}

function assertCan(actor: Actor, req: PermissionRequest) {
  if (!hasPermission(actor.roles, req)) throw forbidden()
}

const fileError = (message: string) =>
  new AppError("VALIDATION_FAILED", message, {
    fieldErrors: { file: [message] },
  })

function parseAlt(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (typeof value !== "string" || value.length > MEDIA_ALT_MAX)
    throw new AppError("VALIDATION_FAILED", "Invalid input", {
      fieldErrors: { alt: [`Up to ${MEDIA_ALT_MAX} characters`] },
    })
  return cleanAltText(value)
}

/**
 * Last path segment, no hidden characters (lib/hidden-chars: they could
 * disguise a name, e.g. "invoice\u202efdp.exe"), at most 200 characters
 * (code points, so an emoji is never cut in half).
 */
function cleanFileName(name: string, ext: string): string {
  const base = name.split(/[\\/]/).pop() ?? ""
  const clean = [...stripHiddenChars(base).trim()].slice(0, 200).join("")
  return clean || `upload.${ext}`
}

export type PreparedUpload = {
  bytes: Uint8Array
  mime: UploadMime
  ext: string
  size: number
  originalName: string
} & ImageInfo

/** Spec §11 pipeline up to storage: size, sniffed type, SVG sanitising, sharp metadata + blur. */
export async function prepareUpload(file: unknown): Promise<PreparedUpload> {
  if (!(file instanceof File)) throw fileError("Choose a file to upload")
  if (file.size === 0) throw fileError("This file is empty")
  if (file.size > MAX_UPLOAD_BYTES) throw fileError("Files can be up to 20 MB")
  let bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffMime(bytes)
  if (!mime)
    throw fileError(
      "Upload a JPEG, PNG, WebP, AVIF, SVG or PDF file, or a Lottie animation (.json or .lottie)"
    )
  if (isLottieUpload(mime)) return prepareLottie(file, bytes, mime)
  if (mime === "image/svg+xml") {
    try {
      bytes = new TextEncoder().encode(
        sanitizeSvg(new TextDecoder().decode(bytes))
      )
    } catch (err) {
      if (err instanceof SvgSanitizeError) throw fileError(err.message)
      throw err
    }
  }
  let info: ImageInfo
  try {
    info = await inspectImage(bytes, mime)
    if (isRasterMime(mime)) {
      // Privacy: store a metadata-free, upright copy (no EXIF/GPS).
      const clean = await reencodeImage(bytes, mime)
      bytes = clean.bytes
      info = { ...info, width: clean.width, height: clean.height }
    }
  } catch (err) {
    if (err instanceof ImageReadError) throw fileError(err.message)
    throw err
  }
  const ext = UPLOAD_TYPES[mime]
  return {
    bytes,
    mime,
    ext,
    size: bytes.byteLength,
    originalName: cleanFileName(file.name, ext),
    ...info,
  }
}

/**
 * Lottie JSON / dotLottie: at most 2 MB, validated (server/lib/lottie:
 * required fields, dotLottie manifest, unpacked-size cap) and stored as
 * uploaded. Width/height are the composition's size; no blur placeholder.
 */
function prepareLottie(
  file: File,
  bytes: Uint8Array<ArrayBuffer>,
  mime: LottieUploadMime
): PreparedUpload {
  if (bytes.byteLength > MAX_LOTTIE_BYTES)
    throw fileError("Lottie files can be up to 2 MB")
  let info: LottieInfo
  try {
    info =
      mime === "video/lottie+json"
        ? validateLottieJson(bytes)
        : validateDotLottie(bytes)
  } catch (err) {
    if (err instanceof LottieError) throw fileError(err.message)
    throw err
  }
  const ext = UPLOAD_TYPES[mime]
  return {
    bytes,
    mime,
    ext,
    size: bytes.byteLength,
    originalName: cleanFileName(file.name, ext),
    width: info.width,
    height: info.height,
    blurDataUrl: null,
  }
}

/** "YYYY/MM/<uuid v7>.<ext>" (UTC). Never reused, so files are cached as immutable. */
export function newMediaKey(ext: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}/${month}/${uuidv7()}.${ext}`
}

/** Library rows (picker + library screen). */
export async function listMedia(
  actor: Actor,
  query: MediaListQuery
): Promise<Paginated<MediaItem>> {
  assertCan(actor, { media: ["read"] })
  const { rows, total } = await listMediaRows(getDb(), {
    q: query.q || undefined,
    kind: query.kind,
    missingAlt: query.missingAlt === "true",
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  })
  return {
    items: rows.map(toItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
  }
}

export async function getMediaItem(
  actor: Actor,
  id: string
): Promise<MediaItem> {
  assertCan(actor, { media: ["read"] })
  const row = await findMediaById(getDb(), id)
  if (!row) throw notFound("Media")
  return toItem(row)
}

/** Where a prepared upload was stored: its new key and the driver holding it. */
type StoredFile = { key: string; driver: StorageName }

/**
 * Stores a prepared file under a new key with the active driver, then runs
 * `write` (the row insert/update + audit) in one transaction. Shared by
 * upload and replace, so both get the same R2 guard and orphan cleanup.
 */
async function storePrepared<T>(
  prepared: PreparedUpload,
  write: (tx: DbOrTx, stored: StoredFile) => Promise<T>
): Promise<T> {
  const db = getDb()
  const storage = await getStorage()
  const key = newMediaKey(prepared.ext)
  await storage.put(key, prepared.bytes, prepared.mime)
  try {
    return await db.transaction(async (tx) => {
      return write(tx, { key, driver: storage.name })
    })
  } catch (err) {
    await storage.delete(key).catch(() => {
      // The key only: driver errors may carry provider or path details.
      console.warn(`[media] could not delete orphaned upload ${key}`)
    })
    throw err
  }
}

/** Deletes a file no row points at any more (after the commit); failures are only logged. */
async function deleteStoredFile(
  file: { key: string; driver: "static" | "disk" | "r2" },
  mediaId: string
): Promise<void> {
  // Static files live in public/ and stay; R2 rows without R2 settings cannot exist.
  const storage = await storageFor(file.driver)
  await storage?.delete(file.key).catch(() => {
    console.warn(`[media] could not delete the old file of ${mediaId}`)
  })
}

/** POST /media/upload: stored with the active driver (R2 if configured, else disk). */
export async function uploadMedia(
  actor: Actor,
  input: { file: unknown; alt?: unknown }
): Promise<MediaItem> {
  assertCan(actor, { media: ["create"] })
  const alt = parseAlt(input.alt)
  const prepared = await prepareUpload(input.file)
  const row = await storePrepared(prepared, async (tx, stored) => {
    const created = await insertMediaRow(tx, {
      key: stored.key,
      driver: stored.driver,
      mime: prepared.mime,
      size: prepared.size,
      width: prepared.width,
      height: prepared.height,
      blurDataUrl: prepared.blurDataUrl,
      alt,
      originalName: prepared.originalName,
      createdBy: actor.userId,
    })
    await writeAudit(tx, actor, {
      action: "media.uploaded",
      entityType: "media",
      entityId: created.id,
      diff: {
        name: prepared.originalName,
        mime: prepared.mime,
        size: prepared.size,
        driver: stored.driver,
      },
    })
    return created
  })
  return toItem(row)
}

const kindOf = (mime: string) =>
  mime.startsWith("image/")
    ? "image"
    : isLottieMime(mime)
      ? "lottie"
      : "document"

const REPLACE_SAME_KIND = {
  image:
    "Replace an image with another image, so the pages using it keep working",
  lottie:
    "Replace a Lottie animation with another Lottie file (.json or .lottie)",
  document: "Replace a document with another PDF",
} as const

/**
 * Usage entity types → the resource whose `read` permission shows their
 * name and link, and the label shown without it (type only).
 */
const USAGE_ACCESS: Record<
  string,
  {
    resource: "page" | "settings" | "service" | "article" | "collection"
    hidden: string
  }
> = {
  page: { resource: "page", hidden: "A page" },
  settings: { resource: "settings", hidden: "Site settings" },
  service: { resource: "service", hidden: "A service" },
  article: { resource: "article", hidden: "An article" },
  team: { resource: "collection", hidden: "A team member" },
  client: { resource: "collection", hidden: "A client" },
  groupCompany: { resource: "collection", hidden: "A group company" },
  "builder-page": { resource: "page", hidden: "A page" },
}

const canReadUsage = (actor: Actor, entityType: string) => {
  const access = USAGE_ACCESS[entityType]
  return !access || hasPermission(actor.roles, { [access.resource]: ["read"] })
}

function describeUsage(
  actor: Actor,
  usage: { entityType: string; entityId: string; field: string },
  names: Map<string, string>
): MediaUsage {
  const { entityType: type, entityId: id } = usage
  const with_ = (label: string, href: string | null) => ({
    ...usage,
    label,
    href,
  })
  // No read on the target: no title or link (drafts may be unpublished).
  if (!canReadUsage(actor, type)) return with_(USAGE_ACCESS[type].hidden, null)
  const name = names.get(`${type}:${id}`) ?? ""
  switch (type) {
    case "page":
      return with_(
        `${PAGE_LABELS[id as keyof typeof PAGE_LABELS] ?? id} page`,
        `/admin/pages/${id}`
      )
    case "settings":
      return isEditableSettingsKey(id)
        ? with_(
            `Settings › ${SETTINGS_ENTRIES[id].label}`,
            `/admin/settings/${id}`
          )
        : isGrowthSettingsKey(id)
          ? with_(GROWTH_SETTINGS[id].label, GROWTH_SETTINGS[id].href)
          : with_(`Settings › ${id}`, null)
    case "service":
      return with_(`Service: ${name}`, `/admin/services/${id}`)
    case "article":
      return with_(`Article: ${name}`, `/admin/insights/${id}`)
    case "team":
      return with_(`Team: ${name}`, `/admin/collections/team?edit=${id}`)
    case "client":
      return with_(`Client: ${name}`, `/admin/collections/clients?edit=${id}`)
    case "groupCompany":
      return with_(
        `Group company: ${name}`,
        `/admin/collections/group-companies?edit=${id}`
      )
    case "builder-page":
      return with_(`Custom page: ${name}`, `/admin/pages/custom/${id}`)
    default:
      return with_(`${type} ${id}`, null)
  }
}

async function usagesOf(
  db: DbOrTx,
  actor: Actor,
  id: string
): Promise<MediaUsage[]> {
  const rows = await listMediaUsages(db, id)
  // Names are only looked up for targets the actor may read.
  const names = await usageTargets(
    db,
    rows.filter((row) => canReadUsage(actor, row.entityType))
  )
  return rows.map((row) => describeUsage(actor, row, names))
}

const inUse = (usages: MediaUsage[]) =>
  new AppError(
    "CONFLICT",
    usages.length > 0
      ? `This file is used in ${usages.length} place${usages.length === 1 ? "" : "s"}. Choose another file there first.`
      : "This file is still used on the site. Choose another file there first.",
    { current: { usages } }
  )

/** Where a file is used, with readable labels and admin links. */
export async function listUsages(
  actor: Actor,
  id: string
): Promise<{ items: MediaUsage[] }> {
  assertCan(actor, { media: ["read"] })
  const db = getDb()
  if (!(await findMediaById(db, id))) throw notFound("Media")
  return { items: await usagesOf(db, actor, id) }
}

/**
 * Alt text, decorative flag, caption and focal point (spec §8.1). Media is
 * not versioned: last write wins. Marking a file decorative keeps its alt
 * text as entered.
 */
export async function updateMedia(
  actor: Actor,
  id: string,
  input: MediaUpdateInput
): Promise<MediaItem> {
  // media:update edits any file; an uploader (media:create, e.g. authors)
  // may describe their own uploads: these descriptive fields only (WCAG 1.1.1).
  const editsAny = hasPermission(actor.roles, { media: ["update"] })
  if (!editsAny) assertCan(actor, { media: ["create"] })
  const row = await getDb().transaction(async (tx) => {
    const existing = await lockMediaRow(tx, id)
    if (!existing) throw notFound("Media")
    if (!editsAny && existing.createdBy !== actor.userId) throw forbidden()
    const patch: Parameters<typeof updateMediaRow>[2] = {}
    if (input.alt !== undefined) patch.alt = cleanAltText(input.alt)
    if (input.isDecorative !== undefined)
      patch.isDecorative = input.isDecorative
    if (input.caption !== undefined) patch.caption = cleanAltText(input.caption)
    if (input.focal !== undefined) {
      patch.focalX = input.focal?.x ?? null
      patch.focalY = input.focal?.y ?? null
    }
    const updated = await updateMediaRow(tx, id, patch)
    if (!updated) throw notFound("Media")
    await writeAudit(tx, actor, {
      action: "media.updated",
      entityType: "media",
      entityId: id,
      // Only fields that changed (review M3): the form always sends them all.
      diff: {
        ...(existing.alt !== updated.alt
          ? { alt: { from: existing.alt, to: updated.alt } }
          : {}),
        ...(existing.isDecorative !== updated.isDecorative
          ? {
              isDecorative: {
                from: existing.isDecorative,
                to: updated.isDecorative,
              },
            }
          : {}),
        ...(existing.caption !== updated.caption
          ? { caption: { from: existing.caption, to: updated.caption } }
          : {}),
        ...(input.focal !== undefined
          ? {
              focal: {
                from:
                  existing.focalX === null || existing.focalY === null
                    ? null
                    : { x: existing.focalX, y: existing.focalY },
                to: input.focal,
              },
            }
          : {}),
      },
    })
    return updated
  })
  // contentReview: alt text feeds the dashboard's SEO health (D3.5).
  invalidate(tag.media(id), tag.contentReview)
  return toItem(row)
}

/** Refused while the file is used anywhere (media_usages RESTRICT, ledger ruling). */
export async function deleteMedia(
  actor: Actor,
  id: string
): Promise<{ ok: true }> {
  assertCan(actor, { media: ["delete"] })
  const row = await getDb().transaction(async (tx) => {
    const existing = await lockMediaRow(tx, id)
    if (!existing) throw notFound("Media")
    const usages = await usagesOf(tx, actor, id)
    if (usages.length > 0) throw inUse(usages)
    try {
      await deleteMediaRow(tx, id)
    } catch (err) {
      // A RESTRICT FK (team photo, client/group logo, or a usage row written
      // after the check) still points at it.
      if (pgErrorCode(err) === FOREIGN_KEY_VIOLATION) throw inUse([])
      throw err
    }
    await writeAudit(tx, actor, {
      action: "media.deleted",
      entityType: "media",
      entityId: id,
      diff: {
        key: existing.key,
        driver: existing.driver,
        name: existing.originalName,
      },
    })
    return existing
  })
  await deleteStoredFile(row, id)
  // contentReview: alt text feeds the dashboard's SEO health (D3.5).
  invalidate(tag.media(id), tag.contentReview)
  return { ok: true }
}

// Replaced files (final review minor 10). The job module imports this
// service, so its name is repeated here (no import cycle).
export const RETIRED_MEDIA_JOB_NAME = "delete-retired-media"
const RETIRED_KEY_PREFIX = "media-retired:"
/**
 * How long a replaced file stays servable at its old URL: pages already
 * rendered with it (open tabs, bfcache, a CDN or proxy cache) keep working.
 */
export const RETIRED_FILE_GRACE_MS = 24 * 60 * 60_000

/** jobs.payload of a retired file: enough to serve it, then delete it. */
type RetiredFile = Omit<MediaFile, "etag"> & { mediaId: string }

function retiredFileOf(payload: unknown): RetiredFile | null {
  if (typeof payload !== "object" || payload === null) return null
  const p = payload as Record<string, unknown>
  if (
    typeof p.key !== "string" ||
    (p.driver !== "disk" && p.driver !== "r2") ||
    typeof p.mime !== "string" ||
    typeof p.size !== "number" ||
    typeof p.mediaId !== "string"
  )
    return null
  return {
    key: p.key,
    driver: p.driver,
    mime: p.mime,
    size: p.size,
    originalName: typeof p.originalName === "string" ? p.originalName : "",
    mediaId: p.mediaId,
  }
}

/** The retired-file job (scheduler): deletes the file once the grace period is over. */
export async function deleteRetiredMediaFile(
  payload: unknown
): Promise<{ warning?: string }> {
  const file = retiredFileOf(payload)
  if (!file) return { warning: "Unreadable retired-file job; nothing deleted" }
  const storage = await storageFor(file.driver)
  if (!storage)
    return {
      warning: `R2 is not configured any more; ${file.key} was left in the old bucket`,
    }
  // Errors propagate: the scheduler retries the job.
  await storage.delete(file.key)
  return {}
}

/**
 * New file for the same media row (spec §8.1 "replace"): usages keep
 * pointing at the id; the new key makes a new immutable URL. Same pipeline
 * as an upload (sniffing, sanitising, re-encoding, active driver, R2 guard).
 * The old file is retired, not deleted: a keyed job written in the same
 * transaction keeps it servable at its old URL for RETIRED_FILE_GRACE_MS,
 * then deletes it.
 */
export async function replaceMedia(
  actor: Actor,
  id: string,
  input: { file: unknown }
): Promise<MediaItem> {
  assertCan(actor, { media: ["update"] })
  const existing = await findMediaById(getDb(), id)
  if (!existing) throw notFound("Media")
  const prepared = await prepareUpload(input.file)
  if (kindOf(prepared.mime) !== kindOf(existing.mime))
    throw fileError(REPLACE_SAME_KIND[kindOf(existing.mime)])
  const { updated } = await storePrepared(prepared, async (tx, stored) => {
    // Locked: a concurrent replace or delete runs before or after this one,
    // so `current.key` is the key this commit really stops pointing at.
    const current = await lockMediaRow(tx, id)
    if (!current) throw notFound("Media")
    const row = await updateMediaRow(tx, id, {
      key: stored.key,
      driver: stored.driver,
      mime: prepared.mime,
      size: prepared.size,
      width: prepared.width,
      height: prepared.height,
      blurDataUrl: prepared.blurDataUrl,
      originalName: prepared.originalName,
      focalX: null,
      focalY: null,
    })
    if (!row) throw notFound("Media")
    await writeAudit(tx, actor, {
      action: "media.replaced",
      entityType: "media",
      entityId: id,
      diff: {
        from: current.originalName || current.key,
        to: prepared.originalName,
        mime: prepared.mime,
        size: prepared.size,
        driver: stored.driver,
      },
    })
    // Static files live in public/ and are never deleted.
    if (current.driver !== "static")
      await insertKeyedJobIfAbsent(tx, {
        name: RETIRED_MEDIA_JOB_NAME,
        key: `${RETIRED_KEY_PREFIX}${current.key}`,
        runAt: new Date(Date.now() + RETIRED_FILE_GRACE_MS),
        payload: {
          key: current.key,
          driver: current.driver,
          mime: current.mime,
          size: current.size,
          originalName: current.originalName,
          mediaId: id,
        } satisfies RetiredFile,
      })
    return { updated: row }
  })
  // contentReview: alt text feeds the dashboard's SEO health (D3.5).
  invalidate(tag.media(id), tag.contentReview)
  return toItem(updated)
}

/** A disk/R2 file the public file route may serve, described by its row. */
export type MediaFile = {
  key: string
  driver: "disk" | "r2"
  mime: string
  originalName: string
  size: number
  /**
   * Strong validator: a key's bytes never change (replace writes a new key)
   * and a move to R2 copies them as they are.
   */
  etag: string
}

/** The servable file named by `key` (null = 404); no storage is touched. */
export async function findMediaFile(key: string): Promise<MediaFile | null> {
  const found = await findServableMedia(getDb(), key)
  // A replaced file stays servable until its retired-file job deletes it.
  const row =
    found ??
    retiredFileOf(
      (await findJobByKey(getDb(), `${RETIRED_KEY_PREFIX}${key}`))?.payload
    )
  if (!row || row.driver === "static") return null
  const hash = createHash("sha256")
    .update(`${row.key}\n${row.size}\n${row.mime}`)
    .digest("hex")
    .slice(0, 32)
  return {
    key: row.key,
    driver: row.driver,
    mime: row.mime,
    originalName: row.originalName,
    size: row.size,
    etag: `"${hash}"`,
  }
}

/**
 * Streams the file (or a range of it) from its driver without buffering it.
 * null = the object is gone or R2 is no longer configured: a migration may
 * have moved it since findMediaFile, so the caller looks the row up again.
 */
export async function openMediaFile(
  file: MediaFile,
  range?: ByteRange
): Promise<StoredStream | null> {
  const storage = await storageFor(file.driver)
  return storage ? storage.stream(file.key, range) : null
}
