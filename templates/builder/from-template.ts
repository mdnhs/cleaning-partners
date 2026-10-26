import { emptyBlock } from "@/blocks/document"
import {
  type BlockInstance,
  type BlockType,
  RESERVED_ANCHORS,
} from "@/blocks/registry"
import type { AboutTemplate } from "@/templates/about/schema"
import type { ContactTemplate } from "@/templates/contact/schema"
import type { HomeTemplate } from "@/templates/home/schema"
import type { LegalTemplate } from "@/templates/legal/schema"
import type { PageData, PageKey } from "@/templates/registry"
import type { ServicesTemplate } from "@/templates/services/schema"
import type { BlogTemplate } from "@/templates/blog/schema"

type Spec = {
  [T in BlockType]: [T, Extract<BlockInstance, { type: T }>["data"]]
}[BlockType]

/** The id a block type's own component renders, if it renders one (R10-2). */
const OWNED_ANCHOR = Object.fromEntries(
  Object.entries(RESERVED_ANCHORS).map(([anchor, type]) => [type, anchor])
) as Partial<Record<BlockType, string>>

const shared = { useShared: true as const }
const sharedBlock = (
  type: "whyChooseUs" | "clients" | "team" | "testimonials" | "map"
): Spec => [type, shared]
const contact = (title: string | null = null): Spec => [
  "contact",
  { ...shared, title },
]

/** Lays `specs` out in order, with owned or fresh unique anchors. */
function toBlocks(specs: Spec[]): BlockInstance[] {
  const doc: { blocks: BlockInstance[] } = { blocks: [] }
  for (const [type, data] of specs) {
    const block = emptyBlock(type, doc)
    const owned = OWNED_ANCHOR[type]
    doc.blocks.push({
      ...block,
      ...(owned ? { anchor: owned } : {}),
      data: structuredClone(data),
    } as BlockInstance)
  }
  return doc.blocks
}

const home = (d: HomeTemplate): Spec[] => [
  ["hero", d.hero],
  sharedBlock("clients"),
  ["services", { layout: "intro", intro: d.services, grid: null }],
  ["whyChooseUs", shared],
  sharedBlock("testimonials"),
  sharedBlock("team"),
  ["blog", d.blog],
  contact(),
  sharedBlock("map"),
]

const about = (d: AboutTemplate): Spec[] => [
  ["hero.page", { ...d.hero, image: null }],
  ["ourStory", d.story],
  ["stats", { items: d.stats }],
  sharedBlock("clients"),
  ["whyChooseUs", shared],
  sharedBlock("team"),
  sharedBlock("testimonials"),
  contact(),
]

const services = (d: ServicesTemplate): Spec[] => [
  ["hero.page", d.hero],
  ["services", { layout: "grid", intro: null, grid: d.grid }],
  ["whyChooseUs", shared],
  sharedBlock("clients"),
  sharedBlock("testimonials"),
  contact(),
]

const contactPage = (d: ContactTemplate): Spec[] => [
  ["hero.page", { ...d.hero, image: null }],
  contact(d.contactTitle),
  ["quoteForm", shared],
  sharedBlock("map"),
]

const legal = (d: LegalTemplate): Spec[] => [
  ["hero.page", d.hero],
  ["richtext", { doc: d.body }],
]

// The filterable, paginated article list is a page feature, not a section, so
// a copy of Blog is not identical: the editor adds a Blog block themselves.
const blog = (d: BlogTemplate): Spec[] => [["hero.page", d.hero], contact()]

/**
 * The blocks that render a fixed page's own copy, in the page's render order
 * (R10-11). The fixed page's data is only read.
 */
export function blocksFromTemplate<K extends PageKey>(
  key: K,
  data: PageData<K>
): BlockInstance[] {
  switch (key as PageKey) {
    case "home":
      return toBlocks(home(data as HomeTemplate))
    case "about":
      return toBlocks(about(data as AboutTemplate))
    case "services":
      return toBlocks(services(data as ServicesTemplate))
    case "contact":
      return toBlocks(contactPage(data as ContactTemplate))
    case "privacy":
    case "terms":
      return toBlocks(legal(data as LegalTemplate))
    case "blog":
      return toBlocks(blog(data as BlogTemplate))
  }
}
