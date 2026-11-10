"use client"

import {
  Briefcase,
  ChevronDown,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

import { JobRow } from "./job-row"
import type { OpenPositionsProps } from "./types"

const CONTROL_CLASS =
  "h-[52px] w-full rounded-xl border border-[#d6e3ea] bg-[#f9fcfd] text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/25"

/** A native select with a leading icon; "" = the "All …" option. */
function FilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  className,
}: {
  icon: typeof MapPin
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <Icon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[18px] size-[18px] -translate-y-1/2 text-subtle"
      />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL_CLASS, "appearance-none pr-11 pl-12")}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[18px] size-[18px] -translate-y-1/2 text-subtle"
      />
    </div>
  )
}

/**
 * "Open Positions": search, location and job type, category chips, and the
 * job rows. Filters run in the browser; without script every job is listed.
 */
export function OpenPositions(props: OpenPositionsProps) {
  const { filters } = props
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [type, setType] = useState("")
  const [category, setCategory] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return props.jobs.filter(
      (job) =>
        (!q ||
          [job.title, job.location, job.category].some((v) =>
            v.toLowerCase().includes(q)
          )) &&
        (!location || job.location === location) &&
        (!type || job.type === type) &&
        (!category || job.category === category)
    )
  }, [props.jobs, query, location, type, category])

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-[9px] font-heading text-sm/[1.3] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand/30 md:px-[18px] md:py-2.5 md:text-[15px]/[1.2]",
      active
        ? "border-navy bg-navy text-white md:border-brand md:bg-brand"
        : "border-line bg-white text-ink hover:border-brand/50 md:bg-surface"
    )

  return (
    <section id="open-positions" className="bg-surface py-12 md:py-28">
      <Container className="flex flex-col gap-4 md:gap-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="flex flex-col gap-2 md:gap-3.5">
            <p
              data-reveal
              className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[2.1px]"
            >
              {props.eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-5xl md:leading-[1.1] md:tracking-normal"
            >
              {props.title}
            </h2>
            <p
              data-reveal
              className="text-base leading-[1.6] text-body md:text-lg md:leading-[1.55]"
            >
              {props.intro}
            </p>
          </div>
          <p className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#e6f7fb] px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-[#0e93ad] md:border md:border-line md:bg-white md:px-[18px] md:py-2.5 md:font-heading md:text-[15px]/[1.2] md:font-bold md:text-ink">
            <Briefcase
              aria-hidden
              className="size-[18px] text-brand max-md:hidden"
            />
            {props.count}
          </p>
        </div>

        <div
          data-reveal
          className="flex flex-col gap-4 md:rounded-[20px] md:border md:border-line md:bg-white md:p-5 md:shadow-[0px_6px_24px_0px_rgba(13,28,51,0.04)]"
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex gap-2.5 md:contents">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">{props.searchPlaceholder}</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-[18px] size-[18px] -translate-y-1/2 text-subtle"
                />
                <input
                  type="search"
                  value={query}
                  placeholder={props.searchPlaceholder}
                  onChange={(event) => setQuery(event.target.value)}
                  className={cn(
                    CONTROL_CLASS,
                    "h-12 rounded-full border-line bg-white pr-4 pl-12 text-[15px] placeholder:text-[#9aa5b1] md:h-[52px] md:rounded-xl md:border-[#d6e3ea] md:bg-[#f9fcfd] md:text-base md:placeholder:text-subtle"
                  )}
                />
              </label>
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-label={props.allTypes}
                onClick={() => setFiltersOpen((open) => !open)}
                className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink md:hidden"
              >
                <SlidersHorizontal aria-hidden className="size-[18px]" />
              </button>
            </div>
            <FilterSelect
              icon={MapPin}
              label={props.allLocations}
              value={location}
              onChange={setLocation}
              options={filters.locations}
              className={cn(
                "md:block md:w-[260px]",
                !filtersOpen && "max-md:hidden"
              )}
            />
            <FilterSelect
              icon={Briefcase}
              label={props.allTypes}
              value={type}
              onChange={setType}
              options={filters.types}
              className={cn(
                "md:block md:w-[240px]",
                !filtersOpen && "max-md:hidden"
              )}
            />
          </div>
          <div className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0">
            <button
              type="button"
              aria-pressed={category === ""}
              onClick={() => setCategory("")}
              className={chip(category === "")}
            >
              {filters.allRoles}
            </button>
            {filters.categories.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-pressed={category === c.name}
                onClick={() => setCategory(category === c.name ? "" : c.name)}
                className={chip(category === c.name)}
              >
                {`${c.name} (${c.count})`}
              </button>
            ))}
          </div>
        </div>

        <ul aria-label={props.title} className="flex flex-col gap-3 md:gap-4">
          {shown.map((job) => (
            <JobRow
              key={job.slug}
              job={job}
              openPill={props.openPill}
              viewJob={props.viewJob}
            />
          ))}
        </ul>
        {shown.length === 0 ? (
          <p
            role="status"
            className="rounded-[20px] border border-dashed border-line bg-white px-6 py-10 text-center text-base text-body"
          >
            {props.emptyText}
          </p>
        ) : null}
      </Container>
    </section>
  )
}
