import "server-only"

import { Hono } from "hono"

import {
  draftInput,
  restoreInput,
  versionInput,
} from "@/lib/schemas/api/content"
import {
  createJobInput,
  jobListQuery,
  jobSlugInput,
  jobVersionQuery,
} from "@/lib/schemas/api/job-postings"
import { idParam } from "@/lib/schemas/api/params"
import type { AppEnv } from "@/server/api/context"
import { actorOf, can } from "@/server/api/middleware/auth"
import { zv } from "@/server/api/validate"

import * as service from "./service"

/** /api/v1/admin/job-postings (careers). */
export const jobPostingsRoutes = new Hono<AppEnv>()
  .get("/", can({ job: ["read"] }), zv("query", jobListQuery), async (c) =>
    c.json(await service.listJobsAdmin(actorOf(c), c.req.valid("query")), 200)
  )
  .post("/", can({ job: ["create"] }), zv("json", createJobInput), async (c) =>
    c.json(await service.createJob(actorOf(c), c.req.valid("json")), 201)
  )
  .get("/:id", can({ job: ["read"] }), zv("param", idParam), async (c) =>
    c.json(await service.getJobAdmin(actorOf(c), c.req.valid("param").id), 200)
  )
  .put(
    "/:id/draft",
    can({ job: ["update"] }),
    zv("param", idParam),
    zv("json", draftInput),
    async (c) =>
      c.json(
        await service.saveJobDraft(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .post(
    "/:id/publish",
    can({ job: ["publish"] }),
    zv("param", idParam),
    zv("json", versionInput),
    async (c) =>
      c.json(
        await service.publishJob(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .post(
    "/:id/close",
    can({ job: ["publish"] }),
    zv("param", idParam),
    zv("json", versionInput),
    async (c) =>
      c.json(
        await service.closeJob(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .post(
    "/:id/reopen",
    can({ job: ["publish"] }),
    zv("param", idParam),
    zv("json", versionInput),
    async (c) =>
      c.json(
        await service.reopenJob(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .post(
    "/:id/restore",
    can({ job: ["update"] }),
    zv("param", idParam),
    zv("json", restoreInput),
    async (c) =>
      c.json(
        await service.restoreJob(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .patch(
    "/:id/slug",
    can({ job: ["update"] }),
    zv("param", idParam),
    zv("json", jobSlugInput),
    async (c) =>
      c.json(
        await service.changeJobSlug(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("json")
        ),
        200
      )
  )
  .delete(
    "/:id",
    can({ job: ["delete"] }),
    zv("param", idParam),
    zv("query", jobVersionQuery),
    async (c) =>
      c.json(
        await service.deleteJob(
          actorOf(c),
          c.req.valid("param").id,
          c.req.valid("query")
        ),
        200
      )
  )
