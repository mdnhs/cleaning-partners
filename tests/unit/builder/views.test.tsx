import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

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
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HowItWorks } from "@/components/services/how-it-works"
import { ServicesGrid } from "@/components/services/services-grid"
import { BLOCK_TYPES } from "@/blocks/registry"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { aboutView } from "@/templates/about/view"
import { Section } from "@/templates/builder/render"
import {
  type ResolvedBlock,
  blockView,
  builderView,
} from "@/templates/builder/views"
import { contactView } from "@/templates/contact/view"
import { homeView } from "@/templates/home/view"
import { servicesView } from "@/templates/services/view"
import {
  howItWorksView,
  locationMapView,
  clientsView,
  teamView,
  testimonialsView,
  whyChooseUsView,
  pageHeroView,
  contactSectionView,
} from "@/templates/shared/views"

const s = fixtureSiteSources()
const home = s.pages.home.data
const about = s.pages.about.data
const services = s.pages.services.data
const contactPage = s.pages.contact.data

const base = { anchor: "a", hidden: false }
let n = 0
const mk = (type: string, data: unknown, anchor = `a${n}`): ResolvedBlock =>
  ({ id: `blk-${n++}`, type, anchor, hidden: false, data }) as ResolvedBlock

const shared = { useShared: true as const }

describe("blockView props equal the fixed pages' props (R10-3 layer 1)", () => {
  const h = homeView(s)
  const a = aboutView(s)
  const sv = servicesView(s)
  const c = contactView(s)

  // [block, expected props, component markup]
  const cases: [string, ResolvedBlock, unknown, () => string][] = [
    [
      "hero",
      mk("hero", home.hero),
      h.hero,
      () => renderToStaticMarkup(<Hero {...h.hero} />),
    ],
    [
      "hero.page",
      mk("hero.page", {
        ...about.hero,
        image: s.settings.site.defaultHeroImage,
      }),
      a.hero,
      () => renderToStaticMarkup(<PageHero {...a.hero} />),
    ],
    [
      "ourStory",
      mk("ourStory", about.story),
      a.story,
      () => renderToStaticMarkup(<OurStory {...a.story} />),
    ],
    [
      "stats",
      mk("stats", { items: about.stats }),
      a.stats,
      () => renderToStaticMarkup(<Stats {...a.stats} />),
    ],
    [
      "services intro",
      mk("services", { layout: "intro", intro: home.services, grid: null }),
      h.services,
      () => renderToStaticMarkup(<Services {...h.services} />),
    ],
    [
      "services grid",
      mk("services", { layout: "grid", intro: null, grid: services.grid }),
      sv.grid,
      () => renderToStaticMarkup(<ServicesGrid {...sv.grid} />),
    ],
    [
      "whyChooseUs",
      mk("whyChooseUs", shared),
      whyChooseUsView(s),
      () => renderToStaticMarkup(<WhyChooseUs {...whyChooseUsView(s)} />),
    ],
    [
      "clients",
      mk("clients", shared),
      clientsView(s),
      () => renderToStaticMarkup(<Clients {...clientsView(s)} />),
    ],
    [
      "team",
      mk("team", shared),
      teamView(s),
      () => renderToStaticMarkup(<Team {...teamView(s)} />),
    ],
    [
      "testimonials",
      mk("testimonials", shared),
      testimonialsView(s),
      () => renderToStaticMarkup(<Testimonials {...testimonialsView(s)} />),
    ],
    [
      "blog",
      mk("blog", home.blog),
      h.blog,
      () => renderToStaticMarkup(<Blog {...h.blog} />),
    ],
    // No fixed page copies it: built by hand from the shared section.
    [
      "howItWorks",
      mk("howItWorks", shared),
      howItWorksView(s),
      () => renderToStaticMarkup(<HowItWorks {...howItWorksView(s)} />),
    ],
    [
      "contact",
      mk("contact", { ...shared, title: null }),
      h.contact,
      () => renderToStaticMarkup(<Contact {...h.contact} />),
    ],
    [
      "contact (page title)",
      mk("contact", { ...shared, title: contactPage.contactTitle }),
      c.contact,
      () => renderToStaticMarkup(<Contact {...c.contact} />),
    ],
    [
      "quoteForm",
      mk("quoteForm", shared),
      c.form,
      () => renderToStaticMarkup(<QuoteForm {...c.form} />),
    ],
    [
      "map",
      mk("map", shared),
      h.map,
      () => renderToStaticMarkup(<LocationMap {...locationMapView(s)} />),
    ],
  ]

  it.each(cases)("%s", (_name, block, props, markup) => {
    const view = blockView(block, s)
    expect(view.props).toEqual(props)
    expect(renderToStaticMarkup(<Section view={view} />)).toBe(markup())
  })

  it("hero.page without an image uses the default hero image", () => {
    const text = about.hero
    const view = blockView(mk("hero.page", { ...text, image: null }), s)
    expect(view.props).toEqual(pageHeroView(s, text))
  })

  it("richtext carries the doc and the check icon", () => {
    const doc = s.pages.privacy.data.body
    const view = blockView(mk("richtext", { doc }), s)
    expect(view.props).toEqual({
      doc,
      checkIcon: s.settings.microcopy.checkIcon.url,
    })
    expect(renderToStaticMarkup(<Section view={view} />)).toContain("<article")
  })

  it("covers all 15 block types", () => {
    const covered = new Set(cases.map(([, b]) => b.type).concat("richtext"))
    expect([...covered].sort()).toEqual([...BLOCK_TYPES].sort())
  })

  it("contact view matches contactSectionView", () => {
    expect(
      blockView(mk("contact", { ...shared, title: "X" }), s).props
    ).toEqual(contactSectionView(s, "X"))
  })
})

describe("builderView", () => {
  it("drops hidden blocks and wraps by anchor", () => {
    const blocks = [
      mk("team", shared, "team"),
      mk("clients", shared, "logos"),
      { ...mk("map", shared, "hidden-map"), hidden: true } as ResolvedBlock,
    ]
    const view = builderView(s, blocks)
    expect(view.blocks.map((b) => [b.anchor, b.owned])).toEqual([
      ["team", true],
      ["logos", false],
    ])
  })
})
void base
