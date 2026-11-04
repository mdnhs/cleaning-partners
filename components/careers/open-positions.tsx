"use client"

import { Briefcase, ChevronDown, MapPin, Search } from "lucide-react"
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
      "rounded-full border px-[18px] py-2.5 font-heading text-[15px]/[1.2] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand/30",
      active
        ? "border-brand bg-brand text-white"
        : "border-line bg-surface text-ink hover:border-brand/50"
    )

  return (
    <section id="open-positions" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3.5">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[2.1px] text-brand"
            >
              {props.eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.1] font-bold text-ink md:text-5xl"
            >
              {props.title}
            </h2>
            <p data-reveal className="text-lg leading-[1.55] text-body">
              {props.intro}
            </p>
          </div>
          <p className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-line bg-white px-[18px] py-2.5 font-heading text-[15px]/[1.2] font-bold text-ink">
            <Briefcase aria-hidden className="size-[18px] text-brand" />
            {props.count}
          </p>
        </div>

        <div
          data-reveal
          className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 shadow-[0px_6px_24px_0px_rgba(13,28,51,0.04)]"
        >
          <div className="flex flex-col gap-3 md:flex-row">
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
                  "pr-4 pl-12 placeholder:text-subtle"
                )}
              />
            </label>
            <FilterSelect
              icon={MapPin}
              label={props.allLocations}
              value={location}
              onChange={setLocation}
              options={filters.locations}
              className="md:w-[260px]"
            />
            <FilterSelect
              icon={Briefcase}
              label={props.allTypes}
              value={type}
              onChange={setType}
              options={filters.types}
              className="md:w-[240px]"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
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

        <ul aria-label={props.title} className="flex flex-col gap-4">
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
