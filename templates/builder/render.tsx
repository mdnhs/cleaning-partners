import { Stats } from "@/components/about/stats"
import { OurStory } from "@/components/about/our-story"
import { QuoteForm } from "@/components/contact/quote-form"
import { Blog } from "@/components/home/blog"
import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { Hero } from "@/components/home/hero"
import { LocationMap } from "@/components/home/location-map"
import { PageHero } from "@/components/home/page-hero"
import { Services } from "@/components/home/services"
import { StepsSection } from "@/components/home/steps-section"
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { IconCardsSection } from "@/components/home/icon-cards-section"
import { HomeMotion } from "@/components/motion/home-motion"
import { ServicesGrid } from "@/components/services/services-grid"
import { RichTextSection } from "@/templates/shared/rich-text-section"

import type { BlockView, BuilderView } from "./views"

/** One block's section, exactly as the fixed pages render it. */
export function Section({
  view,
  after,
}: {
  view: BlockView
  /** The block type rendered just above this one, if any */
  after?: BlockView["type"]
}) {
  switch (view.type) {
    case "hero":
      return <Hero {...view.props} />
    case "hero.page":
      return <PageHero {...view.props} />
    case "ourStory":
      return <OurStory {...view.props} />
    case "stats":
      return <Stats {...view.props} />
    case "services":
      return view.layout === "intro" ? (
        <Services {...view.props} />
      ) : (
        <ServicesGrid {...view.props} />
      )
    case "whyChooseUs":
      return <IconCardsSection {...view.props} />
    case "clients":
      return <Clients {...view.props} />
    case "team":
      return <Team {...view.props} />
    case "testimonials":
      return <Testimonials {...view.props} />
    case "blog":
      return <Blog {...view.props} />
    case "howItWorks":
      return <StepsSection {...view.props} />
    case "contact":
      return <Contact {...view.props} />
    case "quoteForm":
      return <QuoteForm {...view.props} />
    case "map":
      return (
        <LocationMap
          {...view.props}
          fadeColor={after === "quoteForm" ? "var(--color-surface)" : undefined}
        />
      )
    case "richtext":
      return <RichTextSection {...view.props} />
  }
}

/** "/p/[slug]": the CP page shell around the page's visible blocks. */
export function BuilderTemplate({ view }: { view: BuilderView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <main>
            {view.blocks.map((block, i) => {
              const after = view.blocks[i - 1]?.view.type
              return block.owned ? (
                <Section key={block.id} view={block.view} after={after} />
              ) : (
                <div key={block.id} id={block.anchor}>
                  <Section view={block.view} after={after} />
                </div>
              )
            })}
          </main>
        </div>
      </HomeMotion>
    </>
  )
}
