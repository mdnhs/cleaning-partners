import "server-only"

import { uuidv7 } from "uuidv7"

import { stripHiddenChars } from "@/lib/hidden-chars"
import { getDb } from "@/server/db/client"
import { AppError } from "@/server/lib/errors"
import { getStorage, storageFor } from "@/server/lib/storage"
import type { StorageName } from "@/server/lib/storage"
import type { StoredStream } from "@/server/lib/storage/types"

/** Largest CV an applicant may attach. */
export const CV_MAX_BYTES = 5 * 1024 * 1024

export const CV_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
} as const
export type CvMime = keyof typeof CV_TYPES

/**
 * Private storage prefix: CVs have no media row, so the public file route
 * never finds them, and it refuses this prefix outright as well.
 */
export const PRIVATE_PREFIX = "private/"

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  bytes.length >= signature.length &&
  signature.every((value, i) => bytes[i] === value)

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP = [0x50, 0x4b, 0x03, 0x04]
const WORD_BODY = new TextEncoder().encode("word/document.xml")

/** True when `needle` occurs in `bytes` (entry names of a ZIP are plain ASCII). */
function contains(bytes: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++)
      if (bytes[i + j] !== needle[j]) continue outer
    return true
  }
  return false
}

/** The CV's real type from its bytes; the browser's type and name are never trusted. */
export function sniffCv(bytes: Uint8Array): CvMime | null {
  if (
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-"
  )
    return "application/pdf"
  if (startsWith(bytes, OLE)) return "application/msword"
  if (startsWith(bytes, ZIP) && contains(bytes, WORD_BODY))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  return null
}

const cvError = (message: string) =>
  new AppError("VALIDATION_FAILED", message, {
    fieldErrors: { cv: [message] },
  })

export type PreparedCv = {
  bytes: Uint8Array
  mime: CvMime
  ext: (typeof CV_TYPES)[CvMime]
  size: number
  originalName: string
}

/**
 * The name staff download: the applicant's name without its own extension,
 * plus the sniffed one. A polyglot (an MSI is an OLE file like a .doc; a
 * .cmd may start "%PDF") then opens in Word or a PDF reader, never runs.
 */
function cleanName(name: string, ext: string): string {
  const base = name.split(/[\\/]/).pop() ?? ""
  const clean = [...stripHiddenChars(base).trim()].slice(0, 200).join("")
  const stem = clean.replace(/\.[^.]*$/, "").trim()
  return `${stem || "cv"}.${ext}`
}

/** The attached CV, checked (type by its bytes, at most 5 MB); null when none was attached. */
export async function prepareCv(file: unknown): Promise<PreparedCv | null> {
  if (!(file instanceof File) || file.size === 0) return null
  if (file.size > CV_MAX_BYTES) throw cvError("CVs can be up to 5 MB")
  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffCv(bytes)
  if (!mime) throw cvError("Upload a PDF, DOC or DOCX file")
  const ext = CV_TYPES[mime]
  return {
    bytes,
    mime,
    ext,
    size: bytes.byteLength,
    originalName: cleanName(file.name, ext),
  }
}

/** Stores a CV with the current storage driver; returns where it went. */
export async function storeCv(
  cv: PreparedCv,
  now: Date = new Date()
): Promise<{ key: string; driver: StorageName }> {
  const storage = await getStorage(getDb())
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const key = `${PRIVATE_PREFIX}applications/${now.getUTCFullYear()}/${month}/${uuidv7()}.${cv.ext}`
  await storage.put(key, cv.bytes, cv.mime)
  return { key, driver: storage.name }
}

/** The stored CV as a stream; null when it is gone or its driver is unavailable. */
export async function openCv(
  key: string,
  driver: StorageName
): Promise<StoredStream | null> {
  const storage = await storageFor(driver, getDb())
  return storage ? storage.stream(key) : null
}

/** Deletes a stored CV (a missing file is not an error). */
export async function deleteCv(
  key: string,
  driver: StorageName
): Promise<void> {
  const storage = await storageFor(driver, getDb())
  await storage?.delete(key)
}
