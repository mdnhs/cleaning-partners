import type { Metadata } from "next"

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

export const metadata: Metadata = {
  title: "About Us | Cleaning Partners Ltd.",
  description:
    "Over fifteen years of combined experience cleaning homes and businesses across Ireland from our base in Mountmellick, Co. Laois.",
}

export default function AboutPage() {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="About" />
        <main>
          <PageHero
            crumb="About"
            title="About Us"
            description="We at Cleaning Partners Ltd strive to meet the high standards our clients expect."
          />
          <OurStory />
          <Stats />
          <Clients />
          <WhyChooseUs />
          <Team />
          <Testimonials />
          <Contact />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
