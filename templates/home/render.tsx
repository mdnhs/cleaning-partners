import { Blog } from "@/components/home/blog"
import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { Hero } from "@/components/home/hero"
import { LocationMap } from "@/components/home/location-map"
import { Services } from "@/components/home/services"
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"

import type { HomeView } from "./view"

/** "/" */
export function HomeTemplate({ view }: { view: HomeView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
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
        </div>
      </HomeMotion>
    </>
  )
}
