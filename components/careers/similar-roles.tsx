import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Container, SectionHeading } from "@/components/home/section-heading"
import { buttonVariants } from "@/components/ui/button"

import { JobFacts, JobPill } from "./job-facts"
import type { JobDetailView } from "./types"

/** "Similar Roles": up to three other open jobs as cards. */
export function SimilarRoles({
  similar,
}: {
  similar: JobDetailView["similar"]
}) {
  if (similar.jobs.length === 0) return null
  return (
    <section className="bg-surface py-12 md:py-24">
      <Container className="flex flex-col gap-4 md:gap-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            align="left"
            eyebrow={similar.eyebrow}
            title={similar.title}
          />
          <Link
            href={similar.viewAll.href}
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
              className:
                "px-[22px] py-[11px] text-[15px]/[normal] max-md:hidden",
            })}
          >
            {similar.viewAll.label}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul
          data-stagger
          className="-mx-5 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-3"
        >
          {similar.jobs.map((job) => (
            <li
              key={job.slug}
              data-card="light"
              className="flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-[20px] border border-line bg-white p-5 md:w-auto md:gap-4 md:rounded-3xl md:p-6"
            >
              <div className="flex flex-wrap gap-2">
                <JobPill tone="category">{job.category}</JobPill>
                <JobPill tone="open">{similar.openPill}</JobPill>
              </div>
              <h3
                id={`similar-${job.slug}`}
                className="font-heading text-xl/[1.25] font-bold text-ink"
              >
                {job.title}
              </h3>
              <JobFacts
                location={job.location}
                type={job.type}
                hours={job.hours}
                pay={job.pay}
                className="flex-col gap-y-2"
              />
              <Link
                href={job.href}
                aria-describedby={`similar-${job.slug}`}
                className="mt-auto inline-flex items-center gap-1.5 font-heading text-base font-bold text-navy hover:text-brand"
              >
                {similar.viewJob}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={similar.viewAll.href}
          className={buttonVariants({
            variant: "outline-navy",
            size: "pill",
            className: "w-full md:hidden",
          })}
        >
          {similar.viewAll.label}
        </Link>
      </Container>
    </section>
  )
}
