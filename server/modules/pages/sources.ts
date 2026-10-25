import "server-only"

import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import type { SiteSources } from "@/templates/shared/sources"

/**
 * Everything the public templates render. INTERIM (Task 8): served from the
 * seed fixtures, which proves the props refactor is pixel-identical on its
 * own. Task 9 replaces the body with the cached queries and resolveMedia.
 * Call only after `await connection()` inside <Suspense>.
 */
export async function loadSiteSources(): Promise<SiteSources> {
  return fixtureSiteSources()
}
