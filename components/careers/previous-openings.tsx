import { CalendarCheck } from "lucide-react"

import { Container, SectionHeading } from "@/components/home/section-heading"

import { JobFacts, JobPill } from "./job-facts"
import type { PreviousOpeningsProps } from "./types"

/** "Previous Openings": closed jobs, faded, with their closing date. */
export function PreviousOpenings({
  eyebrow,
  title,
  intro,
  closedPill,
  filled,
  jobs,
}: PreviousOpeningsProps) {
  if (jobs.length === 0) return null
  return (
    <section className="bg-white py-12 md:py-28">
      <Container className="flex flex-col gap-4 md:gap-8">
        <SectionHeading
          align="left"
          eyebrow={eyebrow}
          title={title}
          description={intro}
        />
        <ul data-stagger className="flex flex-col gap-4">
          {jobs.map((job) => (
            <li
              key={job.slug}
              className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-[18px] md:flex-row md:items-center md:gap-8 md:rounded-[20px] md:bg-surface/60 md:px-8 md:py-6"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-3 opacity-80">
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  <JobPill tone="category">{job.category}</JobPill>
                  <JobPill tone="closed">{closedPill}</JobPill>
                </div>
                <h3 className="font-heading text-xl/[1.25] font-bold text-[#3d4650] md:text-xl/[1.2] md:text-ink">
                  {job.title}
                </h3>
                <JobFacts
                  location={job.location}
                  type={job.type}
                  hours={job.hours}
                  pay={job.pay}
                />
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-line pt-3 md:flex-col md:items-end md:justify-start md:border-0 md:pt-0">
                <p className="text-[13px]/[1.5] text-[#7a8590] md:text-[13px]/[normal] md:text-subtle">
                  {job.closed}
                </p>
                <p className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-[#7a8590] md:text-[15px] md:text-body">
                  <CalendarCheck aria-hidden className="size-4" />
                  {filled}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
