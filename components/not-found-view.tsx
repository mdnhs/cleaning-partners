import Link from "next/link"

import { Container } from "@/components/home/section-heading"
import { PageHero } from "@/components/home/page-hero"
import { HomeMotion } from "@/components/motion/home-motion"
import { buttonClassName } from "@/components/ui/button"
import type { NotFoundViewProps } from "@/templates/shared/views"

/**
 * The 404 page body: the site's page hero with the 404 copy and a button
 * back home. Used by app/global-not-found.tsx (unknown addresses) and
 * app/(site)/not-found.tsx (notFound() inside a page).
 */
export function NotFoundView({ homeLabel, ...hero }: NotFoundViewProps) {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <main>
          <PageHero {...hero} />
          <section className="bg-white px-6 py-20 md:px-10">
            <Container className="flex justify-center">
              <Link
                href={hero.home.href}
                className={buttonClassName({ variant: "brand", size: "pill" })}
              >
                {homeLabel}
              </Link>
            </Container>
          </section>
        </main>
      </div>
    </HomeMotion>
  )
}
