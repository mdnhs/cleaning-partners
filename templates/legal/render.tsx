import { PageHero } from "@/components/home/page-hero"
import { HomeMotion } from "@/components/motion/home-motion"
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
          <main>
            <PageHero {...view.hero} />
            <RichTextSection doc={view.body} checkIcon={view.checkIcon} />
          </main>
        </div>
      </HomeMotion>
    </>
  )
}
