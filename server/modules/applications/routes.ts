import "server-only"

import { Hono } from "hono"

import { applicationForm } from "@/lib/schemas/api/applications"
import type { AppEnv } from "@/server/api/context"
import { rateLimit } from "@/server/api/middleware/rate-limit"
import { AppError, fieldErrorsFromIssues } from "@/server/lib/errors"
import { clientIp } from "@/server/lib/ip"
import { APPLICATION_RATE_LIMIT } from "@/server/lib/rate-limit"

import * as service from "./service"

/** /api/v1/public/applications — no session; 5 MB body limit (app.ts). */
export const publicApplicationsRoutes = new Hono<AppEnv>()
  .get("/config", async (c) => {
    c.header("Cache-Control", "no-store")
    return c.json(await service.publicApplicationConfig(), 200)
  })
  .post(
    "/",
    // Before parsing: every attempt from an IP counts.
    rateLimit(APPLICATION_RATE_LIMIT),
    async (c) => {
      const body = await c.req
        .parseBody({ all: true })
        .catch(() => ({}) as Record<string, unknown>)
      const { cv, ...fields } = body
      const parsed = applicationForm.safeParse(
        Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [
            key,
            // Single-value fields arrive once; keep arrays for checkbox groups.
            Array.isArray(value) && !["shifts", "certificates"].includes(key)
              ? value[0]
              : value,
          ])
        )
      )
      if (!parsed.success)
        throw new AppError("VALIDATION_FAILED", "Some fields need attention", {
          fieldErrors: fieldErrorsFromIssues(parsed.error.issues),
        })
      await service.submitApplication(
        parsed.data,
        Array.isArray(cv) ? cv[0] : cv,
        { ip: clientIp(c.req.raw.headers) }
      )
      return c.json({ ok: true as const }, 200)
    }
  )
