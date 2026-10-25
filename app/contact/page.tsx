import type { Metadata } from "next"

import { QuoteForm } from "@/components/contact/quote-form"
import { Contact } from "@/components/home/contact"
import { LocationMap } from "@/components/home/location-map"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"

export const metadata: Metadata = {
  title: "Contact Us | Cleaning Partners Ltd.",
  description:
    "Get in touch with the Clean Team for a free, no-obligation quote. 24hr contact: (085) 8062369.",
}

export default function ContactPage() {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="Contact" />
        <main>
          <PageHero
            crumb="Contact"
            title="Contact Us"
            description="Get in touch with the Clean Team for a free, no-obligation quote."
          />
          <Contact title="Ways to Reach Us" />
          <QuoteForm />
          <LocationMap />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
