import { Blog } from "@/components/home/blog"
import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { Hero } from "@/components/home/hero"
import { LocationMap } from "@/components/home/location-map"
import { Services } from "@/components/home/services"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"
import { SiteLocale } from "@/components/site-locale"

import type { HomeView } from "./view"

/** "/" */
export function HomeTemplate({ view }: { view: HomeView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <Hero {...view.hero} />
            <Clients {...view.clients} />
            <Services {...view.services} />
            <WhyChooseUs {...view.whyChooseUs} />
            <Testimonials {...view.testimonials} />
            <Team {...view.team} />
            <Blog {...view.blog} />
            <Contact {...view.contact} />
            <LocationMap {...view.map} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
