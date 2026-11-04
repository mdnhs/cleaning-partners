import { QuoteForm } from "@/components/contact/quote-form"
import { Contact } from "@/components/home/contact"
import { LocationMap } from "@/components/home/location-map"
import { PageHero } from "@/components/home/page-hero"
import { HomeMotion } from "@/components/motion/home-motion"

import type { ContactView } from "./view"

/** "/contact" */
export function ContactTemplate({ view }: { view: ContactView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <main>
            <PageHero {...view.hero} />
            <Contact {...view.contact} />
            <QuoteForm {...view.form} />
            <LocationMap {...view.map} />
          </main>
        </div>
      </HomeMotion>
    </>
  )
}
