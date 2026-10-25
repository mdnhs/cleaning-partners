import "server-only"

import type { StorageDriver } from "./types"

/**
 * R2 is not wired yet (Phase 6 ports the driver and the `cp/` key prefix).
 * Any call fails loudly so nothing can write to R2 by accident.
 */
export function r2Storage(): StorageDriver {
  throw new Error("R2 disabled until Phase 6")
}
