import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { draftMode } from "next/headers"

import type { Seo } from "@/lib/schemas/common"
import type { JobContent } from "@/lib/schemas/content/job"
import { getDb } from "@/server/db/client"
import { tag } from "@/server/lib/cache-tags"

import { findJobBySlug, listJobRows } from "./repo"

/** A job as the public pages read it (published content, or the draft in preview). */
export type PublicJob = {
  id: string
  slug: string
  sortOrder: number
  seo: Seo
  content: JobContent
  /** First publish (the "Posted …" date); null only for a never-published draft in preview. */
  publishedAt: Date | null
  closedAt: Date | null
  /** The job has been published (drafts in preview are not). */
  published: boolean
}

type Row = NonNullable<Awaited<ReturnType<typeof findJobBySlug>>>

function toPublic(row: Row, draft: boolean): PublicJob | null {
  const content = draft ? row.draft : row.published
  if (!content) return null
  return {
    id: row.id,
    slug: row.slug,
    sortOrder: row.sortOrder,
    seo: row.seo,
    content,
    publishedAt: row.publishedAt,
    closedAt: row.closedAt,
    published: row.published !== null,
  }
}

/** Every published job (open and closed) in display order; drafts too in preview. */
export async function listPublishedJobs(): Promise<PublicJob[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.jobs)
  const { isEnabled: draft } = await draftMode()
  const rows = await listJobRows(getDb())
  return rows
    .map((row) => toPublic(row, draft))
    .filter((job): job is PublicJob => job !== null)
}

/** One job for its page; null for an unknown or unpublished slug. */
export async function getJob(slug: string): Promise<PublicJob | null> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.jobs, tag.job(slug))
  const { isEnabled: draft } = await draftMode()
  const row = await findJobBySlug(getDb(), slug)
  return row ? toPublic(row, draft) : null
}
