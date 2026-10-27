import "server-only"

import { createHash } from "node:crypto"

import { S3Client, S3ServiceException } from "@aws-sdk/client-s3"

import type { R2Config } from "@/lib/schemas/integrations"
import { R2_KEY_PREFIX_PATTERN } from "@/lib/schemas/integrations/r2"
import { isTimeoutError } from "@/server/lib/errors"

/** S3 API endpoint of an R2 account (libraries notes §5.5). */
export function r2Endpoint(
  c: Pick<R2Config, "accountId" | "jurisdiction">
): string {
  return c.jurisdiction === "eu"
    ? `https://${c.accountId}.eu.r2.cloudflarestorage.com`
    : `https://${c.accountId}.r2.cloudflarestorage.com`
}

/**
 * The bucket is shared with the sister site: everything this site
 * stores lives under this root and nothing outside it is ever touched (R6-1,
 * O7). Defined once here; the driver re-exports it.
 */
export const R2_PREFIX = "cp/"

/** A folder or key segment that could escape the root, or is not a plain name. */
function unsafeSegment(segment: string): boolean {
  return segment === "" || segment === "." || segment === ".."
}

/**
 * Object key in the bucket for a storage key: always `cp/` + the optional
 * folder (keyPrefix) + `/` + the key. Media rows and URLs keep the bare key;
 * only calls to R2 use this. It is the ONLY place an R2 key or list Prefix is
 * built (`r2ObjectKey(c, "")` is the folder's list prefix, ending in `/`).
 * Throws on a folder or key that could climb out of `cp/`.
 */
export function r2ObjectKey(
  c: Pick<R2Config, "keyPrefix">,
  key: string
): string {
  const folder: unknown = c.keyPrefix ?? ""
  if (typeof folder !== "string") throw new Error("Invalid R2 folder.")
  if (folder !== "" && !R2_KEY_PREFIX_PATTERN.test(folder))
    throw new Error("Invalid R2 folder.")
  if (key.includes("\\") || key.startsWith("/"))
    throw new Error("Invalid R2 key.")
  // A trailing "/" (list prefix) leaves one empty last segment; allow only that.
  const segments = key.split("/")
  if (segments.at(-1) === "") segments.pop()
  if (segments.some(unsafeSegment) && key !== "")
    throw new Error("Invalid R2 key.")
  return `${R2_PREFIX}${folder ? `${folder}/` : ""}${key}`
}

/**
 * S3 client for R2. Checksums only when an operation requires them: R2
 * does not implement several flexible-checksum headers (notes §5.5).
 */
export function createR2Client(c: R2Config): S3Client {
  const client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(c),
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 10_000, requestTimeout: 60_000 },
  })
  // Last line of defence (R6-1): whatever code holds this client, no request
  // can name an object outside cp/.
  client.middlewareStack.add(cpPrefixGuard(c.bucket) as never, {
    step: "initialize",
    name: "cpPrefixGuard",
  })
  return client
}

const GUARD_MESSAGE = "R2 request outside the cp/ prefix was refused."

/**
 * The only S3 commands this site may send. Anything else (lifecycle rules,
 * ListBuckets, ACLs, ...) is refused: the guard fails closed.
 */
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  "PutObjectCommand",
  "GetObjectCommand",
  "HeadObjectCommand",
  "DeleteObjectCommand",
  "DeleteObjectsCommand",
  "CopyObjectCommand",
  "ListObjectsV2Command",
  "CreateMultipartUploadCommand",
  "UploadPartCommand",
  "CompleteMultipartUploadCommand",
  "AbortMultipartUploadCommand",
  "ListPartsCommand",
  "HeadBucketCommand",
])

/**
 * Throws (fixed text, nothing echoed) unless the command is on the allowlist
 * (when its name is given) and every object key it names starts with `cp/`.
 * HeadBucket carries no key and passes. ListObjectsV2 must name a Prefix (a
 * listing without one would cover the whole shared bucket); ListParts is
 * checked by its Key. A CopySource must be `<bucket>/cp/...` in the given
 * bucket (the client's own; R11-2).
 */
export function assertCpInput(
  input: unknown,
  commandName?: string,
  bucket?: string
): void {
  if (commandName !== undefined && !ALLOWED_COMMANDS.has(commandName))
    throw new Error(GUARD_MESSAGE)
  if (
    commandName === "ListObjectsV2Command" &&
    (typeof input !== "object" ||
      input === null ||
      (input as { Prefix?: unknown }).Prefix === undefined)
  )
    throw new Error(GUARD_MESSAGE)
  if (typeof input !== "object" || input === null) return
  const i = input as Record<string, unknown>
  const inside = (v: unknown) =>
    typeof v === "string" && v.startsWith(R2_PREFIX)
  for (const field of ["Key", "Prefix", "StartAfter"] as const)
    if (field in i && i[field] !== undefined && !inside(i[field]))
      throw new Error(GUARD_MESSAGE)
  if ("CopySource" in i && i.CopySource !== undefined) {
    const src = i.CopySource
    if (typeof src !== "string") throw new Error(GUARD_MESSAGE)
    let decoded: string
    try {
      decoded = decodeURIComponent(src)
    } catch {
      throw new Error(GUARD_MESSAGE)
    }
    // "<bucket>/<key>" (a leading "/" is tolerated by S3).
    const [srcBucket, ...keyParts] = decoded.replace(/^\//, "").split("/")
    // The source must be this client's own bucket (R11-2) and a clean key:
    // no empty, "." or ".." segment, so a decoded "cp/../sp/x" cannot pass.
    if (bucket !== undefined && srcBucket !== bucket)
      throw new Error(GUARD_MESSAGE)
    if (keyParts.some(unsafeSegment) || !inside(keyParts.join("/")))
      throw new Error(GUARD_MESSAGE)
  }
  const del = i.Delete
  if (del !== undefined) {
    const objects = (del as { Objects?: unknown } | null)?.Objects
    if (!Array.isArray(objects)) throw new Error(GUARD_MESSAGE)
    for (const o of objects)
      if (!inside((o as { Key?: unknown } | null)?.Key))
        throw new Error(GUARD_MESSAGE)
  }
}

type GuardArgs = { input: unknown }
const cpPrefixGuard =
  (bucket: string) =>
  (
    next: (args: GuardArgs) => Promise<unknown>,
    context: { commandName?: string }
  ) =>
  async (args: GuardArgs) => {
    assertCpInput(args.input, context.commandName ?? "", bucket)
    return next(args)
  }

/**
 * Fixed text for an R2 failure (Phase 6 Task 1 convention): provider
 * messages are never echoed and the original error is not kept as `cause`,
 * so nothing from the request (keys, endpoint) can reach logs or responses.
 */
export function r2Failure(err: unknown): Error {
  if (err instanceof S3ServiceException) {
    const status = err.$metadata.httpStatusCode
    return new Error(
      status ? `R2 answered with HTTP ${status}.` : "R2 answered with an error."
    )
  }
  return new Error(
    isTimeoutError(err) ? "R2 did not respond in time." : "Could not reach R2."
  )
}

/** Fields that shape the client (the bucket binds its CopySource guard). Hashed: no secret is kept in clear as a key. */
function clientFingerprint(c: R2Config): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        c.accountId,
        c.jurisdiction,
        c.accessKeyId,
        c.secretAccessKey,
        c.bucket,
      ])
    )
    .digest("hex")
}

let shared: { fingerprint: string; client: S3Client } | null = null

/**
 * One long-lived client per process for the saved R2 settings: its
 * keep-alive agent is reused across uploads and file reads. A changed
 * account or key pair replaces it (the old client is destroyed).
 */
export function sharedR2Client(c: R2Config): S3Client {
  const fingerprint = clientFingerprint(c)
  if (shared?.fingerprint === fingerprint) return shared.client
  shared?.client.destroy()
  shared = { fingerprint, client: createR2Client(c) }
  return shared.client
}

/** Drops the shared client (R2 disconnected; tests). */
export function resetR2Client(): void {
  shared?.client.destroy()
  shared = null
}
