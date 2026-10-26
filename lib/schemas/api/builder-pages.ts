import { z } from "zod"

import { DraftDocument } from "@/blocks/document"
import {
  BUILDER_SLUG_MAX,
  BUILDER_SLUG_PATTERN,
  isReservedBuilderSlug,
} from "@/lib/builder-slug"
import type { Seo } from "@/lib/schemas/common"

import type { VersionedDto } from "./content"
import { listQuery, sortParam } from "./list"

/** media_usages / revisions / audit entity type of a builder page. */
export const BUILDER_ENTITY = "builder-page"

/** Public path of a builder page. */
export const builderPath = (slug: string) => `/p/${slug}`

/** A slug under /p/: lowercase words, at most 60 characters, not reserved. */
export const builderSlug = z
  .string()
  .max(BUILDER_SLUG_MAX, `Use at most ${BUILDER_SLUG_MAX} characters`)
  .regex(
    BUILDER_SLUG_PATTERN,
    "Use lowercase letters, numbers and single hyphens"
  )
  .refine((value) => !isReservedBuilderSlug(value), "This address is reserved")

const title = z.string().trim().min(1, "Required").max(200)
const version = z.number().int().min(1)

export const builderPageListQuery = listQuery.extend({
  sort: sortParam(["title", "slug", "updatedAt"], {
    field: "updatedAt",
    dir: "desc",
  }),
})
export type BuilderPageListQuery = z.output<typeof builderPageListQuery>

/** A blank page: an address and a title. */
export const newBuilderPageInput = z.object({ slug: builderSlug, title })

/** POST /builder-pages: `seed` (Copy to new page) is checked as a draft. */
export const createBuilderPageInput = newBuilderPageInput.extend({
  seed: DraftDocument.optional(),
})

/** PUT /builder-pages/:id/draft: the service validates against DraftDocument. */
export const builderDraftInput = z.object({
  draft: z.unknown(),
  version,
})

/** PATCH /builder-pages/:id/meta: title and/or address (the address is the URL). */
export const builderMetaInput = z
  .object({ version, title: title.optional(), slug: builderSlug.optional() })
  .refine((v) => v.title !== undefined || v.slug !== undefined, {
    message: "Change the title or the address",
    path: ["title"],
  })

/** DELETE /builder-pages/:id?version=&redirectHome= */
export const builderDeleteQuery = z.object({
  version: z.coerce.number().int().min(1),
  redirectHome: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
})

export type BuilderPageDto = VersionedDto<DraftDocument> & {
  id: string
  slug: string
  title: string
  path: string
  seo: Seo
}

export type BuilderPageListItem = Omit<BuilderPageDto, "draft" | "published">
