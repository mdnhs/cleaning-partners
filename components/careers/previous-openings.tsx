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
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col gap-8">
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
              className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface/60 px-6 py-6 md:flex-row md:items-center md:gap-8 md:px-8"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-3 opacity-80">
                <div className="flex flex-wrap gap-2">
                  <JobPill tone="category">{job.category}</JobPill>
                  <JobPill tone="closed">{closedPill}</JobPill>
                </div>
                <h3 className="font-heading text-xl/[1.2] font-bold text-ink">
                  {job.title}
                </h3>
                <JobFacts
                  location={job.location}
                  type={job.type}
                  hours={job.hours}
                  pay={job.pay}
                />
              </div>
              <div className="flex flex-col gap-1 md:items-end">
                <p className="text-[13px]/[normal] text-subtle">{job.closed}</p>
                <p className="inline-flex items-center gap-1.5 font-heading text-[15px] font-semibold text-body">
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
