import "server-only"

import { sql } from "drizzle-orm"
import { check, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core"

import type { Seo } from "@/lib/schemas/common"
import type { JobContent } from "@/lib/schemas/content/job"

import { id, timestamps, tsz } from "./_shared"
import { versioned } from "./_versioned"

/**
 * Job postings (careers), versioned like services. (`jobs` is the
 * scheduler queue, server/db/schema/jobs.ts.) `closed_at` set = closed
 * by hand (the role is filled); a past closing date in the content closes
 * it too (lib/careers/open.ts).
 */
export const jobPostings = pgTable(
  "job_postings",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    sortOrder: integer("sort_order").notNull().default(0),
    seo: jsonb("seo").$type<Seo>().notNull().default({}),
    closedAt: tsz("closed_at"),
    ...versioned<JobContent>(),
    ...timestamps(),
  },
  (t) => [
    check("job_postings_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ]
)
