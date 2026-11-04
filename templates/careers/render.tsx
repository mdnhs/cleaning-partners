import { HiringProcess } from "@/components/careers/hiring-process"
import { OpenPositions } from "@/components/careers/open-positions"
import { PreviousOpenings } from "@/components/careers/previous-openings"
import { TalentPool } from "@/components/careers/talent-pool"
import type { CareersView } from "@/components/careers/types"
import { WhyJoin } from "@/components/careers/why-join"
import { PageHero } from "@/components/home/page-hero"
import { HomeMotion } from "@/components/motion/home-motion"

/** "/careers" */
export function CareersTemplate({ view }: { view: CareersView }) {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <main>
          <PageHero {...view.hero} />
          <WhyJoin {...view.why} />
          <OpenPositions {...view.open} />
          <PreviousOpenings {...view.previous} />
          <HiringProcess {...view.process} />
          <TalentPool {...view.talentPool} />
        </main>
      </div>
    </HomeMotion>
  )
}
