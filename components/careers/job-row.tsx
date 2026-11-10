import { ArrowRight } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

import { useEntrance } from "@/components/motion/use-entrance"

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
  const entrance = useEntrance()
  return (
    <motion.li
      layout
      initial={entrance}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      data-card="light"
      className="group flex flex-col gap-3 rounded-[18px] border border-line bg-white p-[18px] transition-[border-color,box-shadow] duration-300 hover:border-brand/40 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)] md:flex-row md:items-center md:gap-8 md:rounded-[20px] md:px-8 md:py-7 md:shadow-[0px_8px_15px_0px_rgba(13,28,51,0.05)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <JobPill tone="category">{job.category}</JobPill>
          <JobPill tone="open">{openPill}</JobPill>
        </div>
        <h3
          id={`job-${job.slug}`}
          className="font-heading text-xl/[1.25] font-bold text-ink md:text-[22px]/[1.2]"
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
      <div className="flex items-center justify-between gap-4 border-t border-line pt-3 md:flex-col md:items-end md:border-0 md:pt-0">
        <p className="text-[13px]/[1.5] text-[#7a8590] md:text-[13px]/[normal] md:text-subtle">
          {job.posted}
        </p>
        <Link
          href={job.href}
          aria-describedby={`job-${job.slug}`}
          className={buttonVariants({
            variant: "brand",
            size: "pill-sm",
            className:
              "px-4 py-[9px] text-sm/[1.3] md:px-[22px] md:py-[11px] md:text-[15px]/[normal]",
          })}
        >
          {viewJob}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>
    </motion.li>
  )
}
