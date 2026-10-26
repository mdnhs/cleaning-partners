import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"
import { SiteLocale } from "@/components/site-locale"
import { RichTextSection } from "@/templates/shared/rich-text-section"

import type { LegalView } from "./view"

/**
 * "/privacy" and "/terms": the existing PageHero and the article body
 * styles, in a single readable column.
 */
export function LegalTemplate({ view }: { view: LegalView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            <RichTextSection doc={view.body} checkIcon={view.checkIcon} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
