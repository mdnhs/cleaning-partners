import "server-only"

import { Hono } from "hono"
import { secureHeaders } from "hono/secure-headers"

import { HSTS } from "@/lib/security-headers"
import type { AppEnv } from "@/server/api/context"
import { notFoundHandler, onError } from "@/server/api/middleware/error"
import { requestIdMiddleware } from "@/server/api/middleware/request-id"
import { healthRoutes } from "@/server/modules/health/routes"

/**
 * Admin API routes, chained so `hc<AdminApi>` sees every route type.
 * Empty for now (R4): later phases add `.route("/<resource>", <resource>Routes)`.
 */
export const adminRoutes = new Hono<AppEnv>()
export type AdminApi = typeof adminRoutes

/** Builds the API. Mount order follows spec §7; Phase 2 adds Better Auth + session middleware. */
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

  // 5. Health
  api.route("/v1/health", healthRoutes)

  return api
}

export const app = createApp()
