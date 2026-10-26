import type { StatsProps } from "@/components/about/stats"
import type { OurStoryProps } from "@/components/about/our-story"
import type { QuoteFormProps } from "@/components/contact/quote-form"
import type { BlogProps } from "@/components/home/blog"
import type { ClientsProps } from "@/components/home/clients"
import type { ContactProps } from "@/components/home/contact"
import type { HeroProps } from "@/components/home/hero"
import type { LocationMapProps } from "@/components/home/location-map"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { ServicesProps } from "@/components/home/services"
import type { TeamProps } from "@/components/home/team"
import type { TestimonialsProps } from "@/components/home/testimonials"
import type { WhyChooseUsProps } from "@/components/home/why-choose-us"
import type { HowItWorksProps } from "@/components/services/how-it-works"
import type { ServicesGridProps } from "@/components/services/services-grid"
import type { BlockInstance } from "@/blocks/registry"
import type { WithMedia } from "@/lib/media"
import type { RichTextDoc } from "@/lib/schemas/common"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  clientsView,
  contactSectionView,
  heroView,
  homeBlogView,
  howItWorksView,
  locationMapView,
  ourStoryView,
  pageHeroView,
  quoteFormView,
  servicesGridView,
  servicesIntroView,
  statsView,
  teamView,
  testimonialsView,
  whyChooseUsView,
} from "@/templates/shared/views"

/** A block as the public render receives it: media refs already resolved. */
export type ResolvedBlock = WithMedia<BlockInstance>

/** One section's props, tagged with the component that renders them. */
export type BlockView =
  | { type: "hero"; props: HeroProps }
  | { type: "hero.page"; props: PageHeroProps }
  | { type: "ourStory"; props: OurStoryProps }
  | { type: "stats"; props: StatsProps }
  | { type: "services"; layout: "intro"; props: ServicesProps }
  | { type: "services"; layout: "grid"; props: ServicesGridProps }
  | { type: "whyChooseUs"; props: WhyChooseUsProps }
  | { type: "clients"; props: ClientsProps }
  | { type: "team"; props: TeamProps }
  | { type: "testimonials"; props: TestimonialsProps }
  | { type: "blog"; props: BlogProps }
  | { type: "howItWorks"; props: HowItWorksProps }
  | { type: "contact"; props: ContactProps }
  | { type: "quoteForm"; props: QuoteFormProps }
  | { type: "map"; props: LocationMapProps }
  | {
      type: "richtext"
      props: { doc: WithMedia<RichTextDoc>; checkIcon: string }
    }

/** The id each section's own component renders (R10-2). */
export const OWN_ID: Partial<Record<BlockView["type"], string>> = {
  services: "services",
  team: "team",
  blog: "blog",
  contact: "contact",
  quoteForm: "quote",
}

/**
 * The same builders the fixed pages call, so a block's props equal the
 * fixed page's (R10-3 layer 1).
 */
export function blockView(block: ResolvedBlock, s: SiteSources): BlockView {
  switch (block.type) {
    case "hero":
      return { type: "hero", props: heroView(s, block.data) }
    case "hero.page": {
      const { image, ...text } = block.data
      return {
        type: "hero.page",
        props: pageHeroView(s, image ? { ...text, image } : text),
      }
    }
    case "ourStory":
      return { type: "ourStory", props: ourStoryView(s, block.data) }
    case "stats":
      return { type: "stats", props: statsView(s, block.data.items) }
    case "services": {
      const { layout, intro, grid } = block.data
      if (layout === "intro" && intro)
        return {
          type: "services",
          layout,
          props: servicesIntroView(s, intro),
        }
      if (layout === "grid" && grid)
        return { type: "services", layout, props: servicesGridView(s, grid) }
      throw new Error(`Services block has no ${layout} content`)
    }
    case "whyChooseUs":
      return { type: "whyChooseUs", props: whyChooseUsView(s) }
    case "clients":
      return { type: "clients", props: clientsView(s) }
    case "team":
      return { type: "team", props: teamView(s) }
    case "testimonials":
      return { type: "testimonials", props: testimonialsView(s) }
    case "blog":
      return { type: "blog", props: homeBlogView(s, block.data) }
    case "howItWorks":
      return { type: "howItWorks", props: howItWorksView(s) }
    case "contact":
      return {
        type: "contact",
        props: contactSectionView(s, block.data.title ?? undefined),
      }
    case "quoteForm":
      return {
        type: "quoteForm",
        props: quoteFormView(s, s.pages.contact.data.quoteForm),
      }
    case "map":
      return { type: "map", props: locationMapView(s) }
    case "richtext":
      return {
        type: "richtext",
        props: {
          doc: block.data.doc,
          checkIcon: s.settings.microcopy.checkIcon.url,
        },
      }
  }
}

export type BuilderView = {
  chrome: ChromeView
  blocks: {
    id: string
    anchor: string
    /** The component already renders its anchor; no wrapper needed. */
    owned: boolean
    view: BlockView
  }[]
}

/** Visible blocks only, in order. */
export function builderView(
  s: SiteSources,
  blocks: readonly ResolvedBlock[]
): BuilderView {
  return {
    chrome: chromeView(s),
    blocks: blocks
      .filter((block) => !block.hidden)
      .map((block) => {
        const view = blockView(block, s)
        return {
          id: block.id,
          anchor: block.anchor,
          owned: OWN_ID[view.type] === block.anchor,
          view,
        }
      }),
  }
}
