import { z } from "zod"

import { pageHeroText, text as copyText } from "@/lib/schemas/common"
import { aboutTemplate } from "@/templates/about/schema"
import { homeTemplate } from "@/templates/home/schema"
import { servicesTemplate } from "@/templates/services/schema"

import { defineBlock } from "./define-block"
import { mediaRef, richText, sharedOnly } from "./fields"

// One block per existing public section (R10-2). The renderer maps each to
// its component through templates/shared/views.ts; API validation, the admin
// library and the types all read this list. Field schemas are the fixed
// pages' own (R10-4), so a copied page always fits.

const hero = defineBlock({
  type: "hero",
  label: "Hero",
  icon: "Image",
  description: "The home page's opening banner with headline and buttons.",
  schema: homeTemplate.shape.hero,
  defaults: {
    title: "",
    subtitle: "",
    primaryCta: { label: "", href: "" },
    secondaryCta: { label: "", href: "" },
    memberLabel: "",
    memberLogoAlt: "",
  },
  first: true,
  max: 1,
})

const heroPage = defineBlock({
  type: "hero.page",
  label: "Page hero",
  icon: "PanelTop",
  description: "Banner image with breadcrumb, title and intro.",
  // No image = the site's default hero image, as the about and contact pages.
  schema: pageHeroText.extend({ image: mediaRef.nullable() }),
  defaults: { image: null, crumb: "", title: "", description: "" },
  first: true,
  max: 1,
})

const ourStory = defineBlock({
  type: "ourStory",
  label: "Our story",
  icon: "BookOpen",
  description: "Two photos, the company story and the sectors it serves.",
  schema: aboutTemplate.shape.story,
  defaults: {
    imageAAlt: "",
    imageBAlt: "",
    eyebrow: "",
    title: "",
    paragraphs: { type: "doc", content: [] },
    sectorsHeading: "",
    sectors: [],
    cta: { label: "", href: "" },
  },
})

const stats = defineBlock({
  type: "stats",
  label: "Stats",
  icon: "ChartColumn",
  description: "A band of figures, each with a label.",
  schema: z.object({ items: aboutTemplate.shape.stats }),
  defaults: { items: [{ value: "", label: "" }] },
})

const services = defineBlock({
  type: "services",
  label: "Services",
  icon: "BriefcaseBusiness",
  description: "The services intro or the card grid of published services.",
  schema: z
    .object({
      layout: z.enum(["intro", "grid"]),
      intro: homeTemplate.shape.services.nullable(),
      grid: servicesTemplate.shape.grid.nullable(),
    })
    .superRefine((data, ctx) => {
      if (data[data.layout] === null)
        ctx.addIssue({
          code: "custom",
          message: "Required",
          path: [data.layout],
        })
    }),
  defaults: { layout: "grid", intro: null, grid: null },
  max: 1,
})

const whyChooseUs = defineBlock({
  type: "whyChooseUs",
  label: "Why choose us",
  icon: "BadgeCheck",
  description: "The shared Why choose us section.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const clients = defineBlock({
  type: "clients",
  label: "Clients",
  icon: "Handshake",
  description: "The shared client logo strip.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const team = defineBlock({
  type: "team",
  label: "Team",
  icon: "Users",
  description: "The published team members.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const testimonials = defineBlock({
  type: "testimonials",
  label: "Testimonials",
  icon: "MessageSquareQuote",
  description: "The published customer testimonials.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const blog = defineBlock({
  type: "blog",
  label: "Blog",
  icon: "Newspaper",
  description: "The latest published articles.",
  schema: homeTemplate.shape.blog,
  defaults: { eyebrow: "", title: "", description: "", count: 3 },
  max: 1,
})

const howItWorks = defineBlock({
  type: "howItWorks",
  label: "How it works",
  icon: "ListOrdered",
  description: "The shared step-by-step section.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const contact = defineBlock({
  type: "contact",
  label: "Contact",
  icon: "Contact",
  description: "Contact details, socials and the quote box.",
  schema: z.object({ useShared: z.literal(true), title: copyText.nullable() }),
  defaults: { useShared: true, title: null },
  max: 1,
})

const quoteForm = defineBlock({
  type: "quoteForm",
  label: "Quote form",
  icon: "ClipboardList",
  description: "The request-a-quote form with the contact page's copy.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

const map = defineBlock({
  type: "map",
  label: "Location map",
  icon: "MapPin",
  description: "The shared location map.",
  schema: sharedOnly,
  defaults: { useShared: true },
  max: 1,
})

/** Text-block budget: the shared richText has no node or length caps. */
export const RICH_TEXT_MAX_NODES = 200
export const RICH_TEXT_MAX_CHARS = 50_000
const cappedRichText = richText
  .extend({ content: richText.shape.content.max(RICH_TEXT_MAX_NODES) })
  .refine(
    (doc) => JSON.stringify(doc).length <= RICH_TEXT_MAX_CHARS,
    "This text is too long for one block. Split it into several."
  )

const richtext = defineBlock({
  type: "richtext",
  label: "Text",
  icon: "Type",
  description: "Formatted text: headings, lists, quotes and images.",
  schema: z.object({ doc: cappedRichText }),
  defaults: {},
})

export const BLOCKS = [
  hero,
  heroPage,
  ourStory,
  stats,
  services,
  whyChooseUs,
  clients,
  team,
  testimonials,
  blog,
  howItWorks,
  contact,
  quoteForm,
  map,
  richtext,
] as const

type AnyBlock = (typeof BLOCKS)[number]
export type BlockType = AnyBlock["type"]

export const BLOCK_TYPES = BLOCKS.map((block) => block.type) as [
  BlockType,
  ...BlockType[],
]

export const BLOCK_BY_TYPE = Object.fromEntries(
  BLOCKS.map((block) => [block.type, block])
) as { [B in AnyBlock as B["type"]]: B }

/** Stable across edits; the builder mints a random id. */
export const BlockId = z.string().regex(/^[A-Za-z0-9_-]{4,48}$/)

/** The section's id on the page (unique per page, blocks/document.ts). */
export const Anchor = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]{0,39}$/,
    "Use up to 40 lower-case letters, digits and hyphens, starting with a letter"
  )

/**
 * Section ids a shared section renders itself. Only the owning block may use
 * one as its anchor, else the page has two elements with that id. `top` is
 * the header's id and belongs to no block. validateDocument and
 * DraftDocument enforce it; the builder UI too.
 */
export const RESERVED_ANCHORS: Readonly<Record<string, BlockType>> = {
  services: "services",
  team: "team",
  blog: "blog",
  contact: "contact",
  quote: "quoteForm",
}

/** Why `type` may not use `anchor`, or null. */
export function reservedAnchorProblem(
  anchor: string,
  type: BlockType
): string | null {
  if (!Object.hasOwn(RESERVED_ANCHORS, anchor)) return null
  const owner = RESERVED_ANCHORS[anchor]
  return owner === type
    ? null
    : `"${anchor}" is kept for the ${BLOCK_BY_TYPE[owner].label} section`
}

const instance = <const T extends string, S extends z.ZodType>(block: {
  type: T
  schema: S
}) =>
  z.object({
    id: BlockId,
    type: z.literal(block.type),
    anchor: Anchor,
    hidden: z.boolean(),
    data: block.schema,
  })

export const BlockInstance = z.discriminatedUnion("type", [
  instance(hero),
  instance(heroPage),
  instance(ourStory),
  instance(stats),
  instance(services),
  instance(whyChooseUs),
  instance(clients),
  instance(team),
  instance(testimonials),
  instance(blog),
  instance(howItWorks),
  instance(contact),
  instance(quoteForm),
  instance(map),
  instance(richtext),
])
export type BlockInstance = z.infer<typeof BlockInstance>
export type BlockData<T extends BlockType> = Extract<
  BlockInstance,
  { type: T }
>["data"]

// Compile error if BLOCKS and BlockInstance drift apart.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
export const _blockTypesInSync: Exact<BlockInstance["type"], BlockType> = true
