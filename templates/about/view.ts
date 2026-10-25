import type { OurStoryProps } from "@/components/about/our-story"
import type { StatsProps } from "@/components/about/stats"
import type { ClientsProps } from "@/components/home/clients"
import type { ContactProps } from "@/components/home/contact"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { TeamProps } from "@/components/home/team"
import type { TestimonialsProps } from "@/components/home/testimonials"
import type { WhyChooseUsProps } from "@/components/home/why-choose-us"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  clientsView,
  contactSectionView,
  linkView,
  pageHeroView,
  teamView,
  textView,
  testimonialsView,
  whyChooseUsView,
} from "@/templates/shared/views"

export type AboutView = {
  chrome: ChromeView
  hero: PageHeroProps
  story: OurStoryProps
  stats: StatsProps
  clients: ClientsProps
  whyChooseUs: WhyChooseUsProps
  team: TeamProps
  testimonials: TestimonialsProps
  contact: ContactProps
}

export function aboutView(s: SiteSources): AboutView {
  const page = s.pages.about.data
  const { story } = page
  return {
    chrome: chromeView(s),
    hero: pageHeroView(s, page.hero),
    story: {
      imageA: { src: story.imageA.url, alt: story.imageAAlt },
      imageB: { src: story.imageB.url, alt: story.imageBAlt },
      eyebrow: story.eyebrow,
      title: story.title,
      paragraphs: story.paragraphs,
      sectorsHeading: story.sectorsHeading,
      sectors: story.sectors,
      cta: linkView(s, story.cta),
    },
    stats: {
      stats: page.stats.map((stat) => ({
        ...stat,
        label: textView(s, stat.label),
      })),
    },
    clients: clientsView(s),
    whyChooseUs: whyChooseUsView(s),
    team: teamView(s),
    testimonials: testimonialsView(s),
    contact: contactSectionView(s),
  }
}
