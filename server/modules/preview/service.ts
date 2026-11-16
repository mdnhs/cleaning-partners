import "server-only"

import { z } from "zod"

import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import { PREVIEW_ENTITIES, type PreviewEntity } from "@/lib/schemas/api/preview"
import { isSettingsKey } from "@/lib/schemas/settings"
import { getDb } from "@/server/db/client"
import type { Actor } from "@/server/lib/actor"
import { forbidden, notFound } from "@/server/lib/errors"
import { pagePath } from "@/lib/schemas/api/builder-pages"
import { jobPath } from "@/lib/schemas/api/job-postings"
import { findBuilderPageForEdit } from "@/server/modules/builder-pages/repo"
import { findJobById } from "@/server/modules/job-postings/repo"
import { findArticleForEdit } from "@/server/modules/articles/repo"
import {
  findServiceById,
  listServiceRows,
} from "@/server/modules/services/repo"
import { isPageKey, PAGE_PATHS } from "@/templates/registry"

const READ: Record<PreviewEntity, PermissionRequest> = {
  page: { page: ["read"] },
  service: { service: ["read"] },
  article: { article: ["read"] },
  "builder-page": { page: ["read"] },
  job: { job: ["read"] },
  settings: { settings: ["read"] },
}

/** May preview drafts at all: read permission on some previewable entity. */
export function canPreview(roles: readonly string[]): boolean {
  return (
    PREVIEW_ENTITIES.some((entity) => hasPermission(roles, READ[entity])) ||
    hasPermission(roles, { appearance: ["read"] })
  )
}

/**
 * Public URL that shows the record's draft. Settings (header, footer,
 * shared sections) preview on the home page.
 */
export async function previewPath(
  actor: Actor,
  entity: PreviewEntity,
  id: string
): Promise<string> {
  // The theme is read with appearance:read (a marketer has it, but not
  // settings:read). Every other settings key keeps settings:read.
  const read =
    entity === "settings" && id === "theme"
      ? ({ appearance: ["read"] } satisfies PermissionRequest)
      : READ[entity]
  if (!hasPermission(actor.roles, read)) throw forbidden()
  switch (entity) {
    case "page":
      if (!isPageKey(id)) throw notFound("Page")
      return PAGE_PATHS[id]
    case "service": {
      // services.id is a uuid column: a malformed id would be a 500, not a 404.
      if (!z.uuid().safeParse(id).success) throw notFound("Service")
      const service = await findServiceById(getDb(), id)
      if (!service) throw notFound("Service")
      return `/services/${service.slug}`
    }
    case "job": {
      // job_postings.id is a uuid column: a malformed id would be a 500.
      if (!z.uuid().safeParse(id).success) throw notFound("Job")
      const job = await findJobById(getDb(), id)
      if (!job) throw notFound("Job")
      // Draft mode reads the working copy, published or not.
      return jobPath(job.slug)
    }
    case "article": {
      const article = z.uuid().safeParse(id).success
        ? await findArticleForEdit(getDb(), id)
        : null
      if (!article) throw notFound("Article")
      // In draft mode the public queries read drafts: unpublished articles show too.
      return `/blog/${article.slug}`
    }
    case "builder-page": {
      // Validated first: builder_pages.id is a uuid column.
      const page = z.uuid().safeParse(id).success
        ? await findBuilderPageForEdit(getDb(), id)
        : null
      if (!page) throw notFound("Page")
      // Draft mode reads the working copy, published or not.
      return pagePath(page)
    }
    case "settings":
      if (!isSettingsKey(id)) throw notFound("Settings")
      // The page that shows the section; the rest appear on the home page.
      if (id === "sections.howItWorks") return firstServicePath()
      return SETTINGS_PREVIEW_PATHS[id] ?? "/"
  }
}

/**
 * "How it works" shows only on a service's own page: the first service in
 * display order that is not hidden (its draft, as draft mode reads it).
 */
async function firstServicePath(): Promise<string> {
  const rows = await listServiceRows(getDb())
  const first = rows.find((row) => row.draft.visible !== false)
  return first ? `/services/${first.slug}` : "/services"
}

/** Where a settings key is best seen on the public site. */
const SETTINGS_PREVIEW_PATHS: Partial<Record<string, string>> = {
  "sections.team": "/about#team",
  "sections.contact": "/contact",
  "sections.map": "/contact",
  contact: "/contact",
  careers: "/careers",
}

/** Path of a same-origin public page (Referer) to return to after preview, else "/". */
export function safeReturnPath(
  referer: string | null | undefined,
  appOrigin: string
): string {
  if (!referer) return "/"
  let url: URL
  try {
    url = new URL(referer)
  } catch {
    return "/"
  }
  if (url.origin !== appOrigin) return "/"
  // "//host" or "/\\host" would leave the site as a protocol-relative URL.
  if (!/^\/(?![/\\])/.test(url.pathname)) return "/"
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api"))
    return "/"
  return `${url.pathname}${url.search}`
}
