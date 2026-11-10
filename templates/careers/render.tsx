import { HiringProcess } from "@/components/careers/hiring-process"
import { OpenPositions } from "@/components/careers/open-positions"
import { PreviousOpenings } from "@/components/careers/previous-openings"
import { TalentPool } from "@/components/careers/talent-pool"
import { JobBody } from "@/components/careers/job-body"
import { JobHero } from "@/components/careers/job-hero"
import { JobSidebar } from "@/components/careers/job-sidebar"
import { SimilarRoles } from "@/components/careers/similar-roles"
import { ApplicationForm } from "@/components/careers/application-form"
import { ApplySidebar } from "@/components/careers/apply-sidebar"
import type {
  ApplyView,
  CareersView,
  JobDetailView,
} from "@/components/careers/types"
import { Container } from "@/components/home/section-heading"
import { JsonLd } from "@/components/seo/json-ld"
import { WhyJoin } from "@/components/careers/why-join"
import { PageHero } from "@/components/home/page-hero"
import { HomeMotion } from "@/components/motion/home-motion"
import Link from "next/link"

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
          <section className="bg-white pt-8 pb-12 md:py-24">
            <Container className="grid gap-8 md:gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
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

/** "/careers/<slug>/apply" and "/careers/apply" (the talent pool). */
export function ApplyTemplate({ view }: { view: ApplyView }) {
  const { hero } = view
  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <main>
          <div className="max-md:hidden">
            <PageHero
              crumb={hero.crumb}
              parents={[
                hero.crumbs.careers,
                ...(hero.jobCrumb ? [hero.jobCrumb] : []),
              ]}
              title={hero.title}
              description={hero.subtitle}
              image={hero.image}
              home={hero.crumbs.home}
              ariaLabel={hero.crumbs.ariaLabel}
            />
          </div>
          <section className="bg-surface pb-8 md:py-28">
            <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_384px] lg:gap-10">
              {view.closed ? (
                <div
                  role="status"
                  className="flex flex-col items-start gap-4 self-start rounded-3xl border border-line bg-white p-8 md:p-12"
                >
                  <p className="text-lg leading-[1.6] text-ink">
                    {view.closed.notice}
                  </p>
                  <Link
                    href={view.closed.back.href}
                    className="inline-flex h-[52px] items-center rounded-full bg-brand px-[30px] font-heading text-base font-bold text-white transition-colors hover:bg-brand-deep"
                  >
                    {view.closed.back.label}
                  </Link>
                </div>
              ) : (
                <ApplicationForm view={view} />
              )}
              <ApplySidebar job={view.job} sidebar={view.sidebar} />
            </Container>
          </section>
        </main>
      </div>
    </HomeMotion>
  )
}
