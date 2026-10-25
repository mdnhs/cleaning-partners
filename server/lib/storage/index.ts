import "server-only"

import { diskStorage } from "./disk"
import { r2Storage } from "./r2"
import type { StorageDriver } from "./types"

export { defaultUploadsRoot, diskStorage } from "./disk"
export {
  decodeKeyPath,
  encodeKeyPath,
  IMMUTABLE_CACHE,
  isValidKey,
  keySegments,
  MEDIA_FILE_PATH,
  mediaFileUrl,
  mediaUrl,
  resolveInside,
} from "./paths"
export { r2Storage } from "./r2"
export { STATIC_PREFIX, staticFilePath } from "./static"
export type { StorageDriver, StorageName } from "./types"

/**
 * Driver for new uploads. Always the server disk until Phase 6 adds R2
 * (SP reads integrations.r2 here).
 */
export async function getStorage(): Promise<StorageDriver> {
  return diskStorage()
}

/** Driver holding an existing row's file; null for static rows. R2 rows throw until Phase 6. */
export async function storageFor(
  driver: "static" | "disk" | "r2"
): Promise<StorageDriver | null> {
  if (driver === "disk") return diskStorage()
  if (driver === "static") return null
  return r2Storage()
}
