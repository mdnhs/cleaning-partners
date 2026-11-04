import { z } from "zod"

import { slug } from "@/lib/schemas/common"
import type { JobContent } from "@/lib/schemas/content/job"

import type { VersionedDto } from "./content"
import { listQuery, sortParam } from "./list"

/** revisions / audit / preview entity type of a job posting. */
export const JOB_ENTITY = "job"

/** Public address of a job posting. */
export const jobPath = (slug: string) => `/careers/${slug}`

/** Which jobs a list shows: open (taking applications), closed (published, no longer open), draft (never published). */
export const JOB_LIST_STATUSES = ["all", "open", "closed", "draft"] as const
export type JobListStatus = (typeof JOB_LIST_STATUSES)[number]

export const jobListQuery = listQuery.extend({
  status: z.enum(JOB_LIST_STATUSES).default("all"),
  sort: sortParam(["sortOrder", "title", "updatedAt"], {
    field: "sortOrder",
    dir: "asc",
  }),
})
export type JobListQuery = z.output<typeof jobListQuery>

/** POST /job-postings — draft is validated against jobContent by the service. */
export const createJobInput = z.object({ slug, draft: z.unknown() })

/** PATCH /job-postings/:id/slug — changes the public URL immediately. */
export const jobSlugInput = z.object({
  slug,
  version: z.number().int().min(1),
})

export const jobVersionQuery = z.object({
  version: z.coerce.number().int().min(1),
})

export type JobDto = VersionedDto<JobContent> & {
  id: string
  slug: string
  path: string
  sortOrder: number
  title: string
  /** Draft values, for the admin list. */
  category: string
  location: string
  /** Closed by hand (the role is filled); null = not closed by hand. */
  closedAt: string | null
  /** Taking applications now (lib/careers/open.ts). */
  open: boolean
}

export type JobListItem = Omit<JobDto, "draft" | "published">
