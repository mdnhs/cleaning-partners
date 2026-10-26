import "server-only"

import { Hono } from "hono"
import { secureHeaders } from "hono/secure-headers"

import { HSTS } from "@/lib/security-headers"
import type { AppEnv } from "@/server/api/context"
import { limitAdminBody, limitBody } from "@/server/api/middleware/body-limit"
import {
  requireSignedIn,
  sessionMiddleware,
} from "@/server/api/middleware/auth"
import { notFoundHandler, onError } from "@/server/api/middleware/error"
import { requestIdMiddleware } from "@/server/api/middleware/request-id"
import { sameOrigin } from "@/server/api/middleware/same-origin"
import { getAuth } from "@/server/auth/auth"
import { articlesRoutes } from "@/server/modules/articles/routes"
import { auditRoutes } from "@/server/modules/audit/routes"
import {
  categoriesRoutes,
  clientsRoutes,
  groupCompaniesRoutes,
  teamRoutes,
  testimonialsRoutes,
} from "@/server/modules/collections/routes"
import { dashboardRoutes } from "@/server/modules/dashboard/routes"
import { healthRoutes } from "@/server/modules/health/routes"
import { internalRoutes } from "@/server/modules/internal/routes"
import { integrationsRoutes } from "@/server/modules/integrations/routes"
import { publicLeadsRoutes } from "@/server/modules/leads/routes"
import { mediaFileRoutes, mediaRoutes } from "@/server/modules/media/routes"
import { pagesRoutes } from "@/server/modules/pages/routes"
import {
  adminPreviewRoutes,
  previewExitRoutes,
} from "@/server/modules/preview/routes"
import { reorderRoutes } from "@/server/modules/reorder/routes"
import { revisionsRoutes } from "@/server/modules/revisions/routes"
import { searchRoutes } from "@/server/modules/search/routes"
import { servicesRoutes } from "@/server/modules/services/routes"
import { settingsRoutes } from "@/server/modules/settings/routes"
import { usersRoutes } from "@/server/modules/users/routes"

/**
 * Admin API routes, chained so `hc<AdminApi>` sees every route type.
 * Later phases add `.route("/<resource>", <resource>Routes)`.
 */
export const adminRoutes = new Hono<AppEnv>()
  .route("/audit", auditRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/users", usersRoutes)
  .route("/search", searchRoutes)
  .route("/pages", pagesRoutes)
  .route("/articles", articlesRoutes)
  .route("/services", servicesRoutes)
  .route("/team", teamRoutes)
  .route("/clients", clientsRoutes)
  .route("/group-companies", groupCompaniesRoutes)
  .route("/testimonials", testimonialsRoutes)
  .route("/categories", categoriesRoutes)
  .route("/reorder", reorderRoutes)
  .route("/settings", settingsRoutes)
  .route("/media", mediaRoutes)
  .route("/integrations", integrationsRoutes)
  .route("/revisions", revisionsRoutes)
  .route("/preview", adminPreviewRoutes)
export type AdminApi = typeof adminRoutes

/** Builds the API. Mount order follows spec §7. */
export function createApp() {
  const api = new Hono<AppEnv>().basePath("/api")

  // 1. Global
  api.use("*", requestIdMiddleware)
  // Same HSTS as the pages (lib/security-headers.ts).
  api.use("*", secureHeaders({ strictTransportSecurity: HSTS }))
  api.use("*", async (c, next) => {
    c.set("actor", null)
    await next()
    c.header("X-Robots-Tag", "noindex")
  })
  api.onError(onError)
  api.notFound(notFoundHandler)

  // 2. Better Auth (sign-in, sign-out, password reset, two-factor)
  api.on(["GET", "POST"], "/auth/*", limitBody("public"), (c) =>
    getAuth().handler(c.req.raw)
  )

  // 3. Public endpoints: 64 KB body
  api.use("/v1/public/*", limitBody("public"))
  api.route("/v1/public/leads", publicLeadsRoutes)

  // 4. Admin endpoints: session → signed in → same origin → body limit (1 MB; uploads 20 MB)
  api.use(
    "/v1/admin/*",
    sessionMiddleware,
    requireSignedIn,
    sameOrigin(),
    limitAdminBody
  )
  api.route("/v1/admin", adminRoutes)

  // Leaving draft-mode preview needs no session (cookies are cleared).
  api.route("/v1/preview", previewExitRoutes)

  // 5. Health
  api.route("/v1/health", healthRoutes)

  // Scheduler → cache expiry (HMAC, HKDF "cron"; ledger ruling). Not admin:
  // no session; the signature is the authentication. No CORS: only the
  // server itself calls it.
  api.use("/v1/internal/*", limitBody("public"))
  api.route("/v1/internal", internalRoutes)

  // 6. Media files (disk or R2), public and cacheable (spec §11)
  api.route("/v1/media/file", mediaFileRoutes)

  return api
}

export const app = createApp()
