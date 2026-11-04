import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

import { JobFacts, JobPill } from "./job-facts"
import type { JobRowView } from "./types"

/** One open job in the list on /careers. */
export function JobRow({
  job,
  openPill,
  viewJob,
}: {
  job: JobRowView
  openPill: string
  viewJob: string
}) {
  return (
    <li
      data-card="light"
      className="group flex flex-col gap-5 rounded-[20px] border border-line bg-white px-6 py-6 shadow-[0px_8px_15px_0px_rgba(13,28,51,0.05)] transition-[border-color,box-shadow] duration-300 hover:border-brand/40 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)] md:flex-row md:items-center md:gap-8 md:px-8 md:py-7"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <JobPill tone="category">{job.category}</JobPill>
          <JobPill tone="open">{openPill}</JobPill>
        </div>
        <h3
          id={`job-${job.slug}`}
          className="font-heading text-[22px]/[1.2] font-bold text-ink"
        >
          <Link
            href={job.href}
            className="outline-none hover:text-navy focus-visible:underline"
          >
            {job.title}
          </Link>
        </h3>
        <JobFacts
          location={job.location}
          type={job.type}
          hours={job.hours}
          pay={job.pay}
        />
      </div>
      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
        <p className="text-[13px]/[normal] text-subtle">{job.posted}</p>
        <Link
          href={job.href}
          aria-describedby={`job-${job.slug}`}
          className={buttonVariants({
            variant: "brand",
            size: "pill-sm",
            className: "px-[22px] py-[11px] text-[15px]/[normal]",
          })}
        >
          {viewJob}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>
    </li>
  )
}
