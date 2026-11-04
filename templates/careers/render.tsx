import { HiringProcess } from "@/components/careers/hiring-process"
import { OpenPositions } from "@/components/careers/open-positions"
import { PreviousOpenings } from "@/components/careers/previous-openings"
import { TalentPool } from "@/components/careers/talent-pool"
import { JobBody } from "@/components/careers/job-body"
import { JobHero } from "@/components/careers/job-hero"
import { JobSidebar } from "@/components/careers/job-sidebar"
import { SimilarRoles } from "@/components/careers/similar-roles"
import type { CareersView, JobDetailView } from "@/components/careers/types"
import { Container } from "@/components/home/section-heading"
import { JsonLd } from "@/components/seo/json-ld"
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

/** "/careers/<slug>" */
export function JobDetailTemplate({
  view,
  jsonLd,
}: {
  view: JobDetailView
  jsonLd: object | null
}) {
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        {jsonLd ? <JsonLd data={jsonLd} /> : null}
        <main>
          <JobHero slug={view.slug} open={view.open} hero={view.hero} />
          <section className="bg-white py-16 md:py-24">
            <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
              <JobBody body={view.body} />
              <JobSidebar
                sidebar={view.sidebar}
                title={view.hero.title}
                open={view.open}
                checkIcon={view.body.checkIcon}
              />
            </Container>
          </section>
          <SimilarRoles similar={view.similar} />
        </main>
      </div>
    </HomeMotion>
  )
}
