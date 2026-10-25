import { OurStory } from "@/components/about/our-story"
import { Stats } from "@/components/about/stats"
import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"
import { SiteLocale } from "@/components/site-locale"

import type { AboutView } from "./view"

/** "/about" */
export function AboutTemplate({ view }: { view: AboutView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            <OurStory {...view.story} />
            <Stats {...view.stats} />
            <Clients {...view.clients} />
            <WhyChooseUs {...view.whyChooseUs} />
            <Team {...view.team} />
            <Testimonials {...view.testimonials} />
            <Contact {...view.contact} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
