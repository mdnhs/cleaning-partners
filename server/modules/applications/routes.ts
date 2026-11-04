import "server-only"

import { Hono } from "hono"

import {
  applicationExportQuery,
  applicationForm,
  applicationListQuery,
  applicationNoteInput,
  updateApplicationInput,
} from "@/lib/schemas/api/applications"
import { idParam } from "@/lib/schemas/api/params"
import type { AppEnv } from "@/server/api/context"
import { actorOf, can } from "@/server/api/middleware/auth"
import { rateLimit } from "@/server/api/middleware/rate-limit"
import { zv } from "@/server/api/validate"
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

/**
 * `attachment; filename="…"` that survives any original name: quotes,
 * backslashes and control/non-ASCII characters are replaced in the plain
 * form; the RFC 5987 form keeps the real name.
 */
function attachment(name: string): string {
  const plain = name.replace(/["\\]/g, "_").replace(/[^\x20-\x7e]/g, "_")
  return `attachment; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/** /api/v1/admin/applications — the Careers inbox, on the lead permissions. Static paths before /:id. */
export const applicationsRoutes = new Hono<AppEnv>()
  .get(
    "/",
    can({ lead: ["read"] }),
    zv("query", applicationListQuery),
    async (c) =>
      c.json(
        await service.listApplications(actorOf(c), c.req.valid("query")),
        200
      )
  )
  .get(
    "/export.csv",
    can({ lead: ["export"] }),
    zv("query", applicationExportQuery),
    async (c) => {
      const { csv, filename } = await service.exportApplications(
        actorOf(c),
        c.req.valid("query")
      )
      return c.body(csv, 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      })
    }
  )
  .get("/badge", can({ lead: ["read"] }), async (c) =>
    c.json(await service.applicationBadge(actorOf(c)), 200)
  )
  .get("/:id", can({ lead: ["read"] }), zv("param", idParam), async (c) =>
    c.json(
      await service.getApplication(actorOf(c), c.req.valid("param").id),
      200
    )
  )
  .get("/:id/cv", can({ lead: ["read"] }), zv("param", idParam), async (c) => {
    const { stream, name, mime } = await service.openApplicationCv(
      actorOf(c),
      c.req.valid("param").id
    )
    return c.body(stream.body, 200, {
      "Content-Type": mime,
      "Content-Length": String(stream.size),
      "Content-Disposition": attachment(name),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
  })
  .patch(
    "/:id",
    can({ lead: ["update"] }),
    zv("param", idParam),
    zv("json", updateApplicationInput),
    async (c) =>
      c.json(
        await service.updateApplication(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .post(
    "/:id/notes",
    can({ lead: ["update"] }),
    zv("param", idParam),
    zv("json", applicationNoteInput),
    async (c) =>
      c.json(
        await service.addApplicationNote(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        201
      )
  )
  .delete("/:id", can({ lead: ["delete"] }), zv("param", idParam), async (c) =>
    c.json(
      await service.deleteApplication(actorOf(c), c.req.valid("param").id),
      200
    )
  )
