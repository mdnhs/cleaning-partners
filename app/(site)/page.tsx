import { Blog } from "@/components/home/blog"
import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { HomeMotion } from "@/components/motion/home-motion"
import { Hero } from "@/components/home/hero"
import { LocationMap } from "@/components/home/location-map"
import { Services } from "@/components/home/services"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Team } from "@/components/home/team"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"

export default function Page() {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader />
        <main>
          <Hero />
          <Clients />
          <Services />
          <WhyChooseUs />
          <Testimonials />
          <Team />
          <Blog />
          <Contact />
          <LocationMap />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
