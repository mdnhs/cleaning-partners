import { eq } from "drizzle-orm"

import { type BuilderDocument, validateDocument } from "@/blocks/document"
import type { BlockInstance } from "@/blocks/registry"
import type { getDb } from "@/server/db/client"
import { builderPages, pages } from "@/server/db/schema"
import type { AboutTemplate } from "@/templates/about/schema"
import type { HomeTemplate } from "@/templates/home/schema"
import type { ServicesTemplate } from "@/templates/services/schema"

import { BUILDER_FIXTURE_HOME_SLUG, BUILDER_FIXTURE_SLUG } from "./builder-slug"

type Db = ReturnType<typeof getDb>

async function published<T>(db: Db, key: string): Promise<T> {
  const [row] = await db
    .select({ published: pages.published })
    .from(pages)
    .where(eq(pages.key, key))
  if (!row?.published)
    throw new Error(`visual seed: page "${key}" has no published data`)
  return row.published as T
}

const t = (text: string) => ({ type: "text" as const, text })
const p = (text: string) => ({ type: "paragraph" as const, content: [t(text)] })

/**
 * Two published builder pages that together show all 15 block types and both
 * services layouts (R10-9). Media ids come from the seeded fixed pages. Only
 * the visual seed calls this: never `pnpm db:seed`, never the e2e seed. It
 * writes no media_usages rows.
 */
export async function seedVisualBuilderPages(db: Db) {
  const home = await published<HomeTemplate>(db, "home")
  const about = await published<AboutTemplate>(db, "about")
  const services = await published<ServicesTemplate>(db, "services")

  const block = (
    id: string,
    type: BlockInstance["type"],
    data: unknown,
    hidden = false
  ) =>
    ({ id, type, anchor: id.replace(/^b-/, ""), hidden, data }) as BlockInstance

  const main = {
    blocks: [
      block("b-hero-page", "hero.page", {
        image: null,
        crumb: "Fixture",
        title: "Every block on one page",
        description:
          "A fixture page for the visual baselines, showing each section the builder can place.",
      }),
      block("b-our-story", "ourStory", {
        ...about.story,
        eyebrow: "Our story",
        title: "Cleaning done properly, every visit",
      }),
      block("b-stats", "stats", {
        items: [
          { value: "20+", label: "Years cleaning Irish workplaces" },
          { value: "500", label: "Sites looked after" },
          { value: "24/7", label: "Cover when you need it" },
        ],
      }),
      block("b-services", "services", {
        layout: "grid",
        intro: null,
        grid: services.grid,
      }),
      block("b-why-choose-us", "whyChooseUs", { useShared: true }),
      block("b-clients", "clients", { useShared: true }),
      block("b-contact", "contact", { useShared: true, title: null }),
      block("b-quote-form", "quoteForm", { useShared: true }),
      block("b-map", "map", { useShared: true }),
      block("b-richtext", "richtext", {
        doc: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [t("What a visit includes")],
            },
            {
              type: "paragraph",
              attrs: { variant: "lead" },
              content: [
                t("Every clean follows a written checklist agreed with you."),
              ],
            },
            {
              type: "bulletList",
              attrs: { variant: "checklist" },
              content: [
                {
                  type: "listItem",
                  content: [p("Floors vacuumed and mopped")],
                },
                { type: "listItem", content: [p("Surfaces and desks wiped")] },
                { type: "listItem", content: [p("Bins emptied and relined")] },
              ],
            },
            {
              type: "blockquote",
              content: [p("A clean workplace is a better place to work.")],
            },
          ],
        },
      }),
      block(
        "b-hidden-stats",
        "stats",
        {
          items: [
            { value: "HIDDEN", label: "This stats block must not render" },
          ],
        },
        true
      ),
    ],
  }

  const homePage = {
    blocks: [
      block("b-hero", "hero", {
        ...home.hero,
        title: "Clean spaces, calm teams",
        subtitle: "Reliable commercial cleaning across Ireland.",
      }),
      block("b-services-intro", "services", {
        layout: "intro",
        intro: home.services,
        grid: null,
      }),
      block("b-team", "team", { useShared: true }),
      block("b-testimonials", "testimonials", { useShared: true }),
      block("b-blog", "blog", {
        eyebrow: "Latest news",
        title: "Cleaning advice from the team",
        description: "Short guides on keeping a workplace clean.",
        count: 3,
      }),
      block("b-how-it-works", "howItWorks", { useShared: true }),
    ],
  }

  for (const [slug, title, doc] of [
    [BUILDER_FIXTURE_SLUG, "Visual fixture", main],
    [BUILDER_FIXTURE_HOME_SLUG, "Visual fixture home", homePage],
  ] as const) {
    const result = validateDocument(doc)
    if (!result.ok)
      throw new Error(
        `visual seed: fixture "${slug}" is invalid: ${JSON.stringify(result.fieldErrors)}`
      )
    const valid: BuilderDocument = result.doc
    await db.insert(builderPages).values({
      slug,
      title,
      draft: valid,
      published: valid,
      status: "published",
      publishedAt: new Date(),
    })
  }
}
