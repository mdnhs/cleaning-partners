import type { Metadata } from "next"

import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"
import { ServicesGrid } from "@/components/services/services-grid"

export const metadata: Metadata = {
  title: "Our Services | Cleaning Partners Ltd.",
  description:
    "Medical, education, commercial and retail cleaning plus ULV fogging for hospitals, GP clinics, schools, offices, shops and homes across Ireland.",
}

export default function ServicesPage() {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="Services" />
        <main>
          <PageHero
            crumb="Services"
            title="Our Services"
            description="Cleaning for hospitals, health centres and GP clinics, schools and colleges, offices, shops and homes."
            image="/images/home/cleaning-the-counter.png"
          />
          <ServicesGrid />
          <WhyChooseUs />
          <Clients />
          <Testimonials />
          <Contact />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
