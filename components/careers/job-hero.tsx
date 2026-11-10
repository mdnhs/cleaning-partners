import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Clock,
  Euro,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Fragment } from "react"

import { Container } from "@/components/home/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { SaveJobButton } from "./save-job-button"
import type { JobDetailView } from "./types"

/** The banner of a job page: breadcrumb, pills, title, facts and actions. */
export function JobHero({
  slug,
  open,
  hero,
}: {
  slug: string
  open: boolean
  hero: JobDetailView["hero"]
}) {
  const facts = [
    { icon: MapPin, text: hero.facts.location },
    { icon: Briefcase, text: hero.facts.type },
    { icon: Clock, text: hero.facts.hours },
    { icon: Euro, text: hero.facts.pay },
  ]
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src={hero.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          preload
        />
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(40,100,143,0.6)] to-[rgba(15,47,71,0.88)]" />
      </div>
      <Container
        data-hero-content
        className="flex flex-col items-start gap-3.5 pt-6 pb-7 text-left sm:min-h-[520px] sm:items-center sm:justify-center sm:gap-5 sm:py-16 sm:text-center"
      >
        <nav
          aria-label={hero.crumbs.ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap items-center gap-1.5 text-[13px]/[1.5] sm:justify-center sm:gap-2.5 sm:rounded-full sm:bg-white/14 sm:px-[18px] sm:py-2 sm:font-heading sm:text-[15px]/[normal]"
        >
          {[hero.crumbs.home, hero.crumbs.careers].map((crumb, i) => (
            <Fragment key={crumb.href}>
              <Link
                href={crumb.href}
                className={cn(
                  "font-medium text-white/70 transition-colors hover:text-white sm:text-white/80",
                  i === 0 && "max-sm:hidden"
                )}
              >
                {crumb.label}
              </Link>
              <span
                aria-hidden
                className={cn("font-medium text-white/50 max-sm:hidden")}
              >
                /
              </span>
              {i === 1 && (
                <ChevronRight
                  aria-hidden
                  className="size-3.5 text-white/70 sm:hidden"
                />
              )}
            </Fragment>
          ))}
          <span aria-current="page" className="font-bold text-white">
            {hero.title}
          </span>
        </nav>
        <div
          data-intro
          data-hero-copy
          className="flex flex-wrap gap-1.5 sm:justify-center sm:gap-2"
        >
          {open ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f6ec] px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-[#1e8e4e] sm:px-3 sm:py-1.5 sm:font-heading sm:text-[13px] sm:font-bold sm:text-[#1f8a4c]">
              <span
                aria-hidden
                className="size-[7px] rounded-full bg-[#2fb36a] max-sm:hidden"
              />
              {hero.nowHiring}
            </span>
          ) : null}
          <span className="rounded-full bg-white/16 px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-white sm:bg-brand-soft sm:px-3 sm:py-1.5 sm:font-heading sm:font-bold sm:text-brand-deep">
            {hero.category}
          </span>
        </div>
        <h1
          data-intro
          data-hero-title
          className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-white sm:text-[40px] sm:leading-[1.1] sm:tracking-normal md:text-[60px]"
        >
          {hero.title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[720px] text-base leading-[1.6] text-white/90 sm:text-lg sm:leading-[1.5] sm:text-white/92 md:text-xl"
        >
          {hero.summary}
        </p>
        <ul
          data-intro
          data-hero-copy
          className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3"
        >
          {facts.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="sm:font-body flex min-h-[88px] flex-col items-start gap-1 rounded-[14px] border border-white/20 bg-white/12 p-3 font-heading text-sm/[1.3] font-semibold text-white sm:inline-flex sm:min-h-0 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border-0 sm:bg-white/14 sm:px-4 sm:py-2 sm:text-[15px] sm:font-normal"
            >
              <Icon aria-hidden className="size-4" />
              {text}
            </li>
          ))}
        </ul>
        {open ? (
          <div
            data-intro
            // The row rises as one (data-hero-copy); per-button stagger
            // (data-hero-actions) left the link at its start state here.
            data-hero-copy
            className="flex w-full items-center gap-2.5 sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3 sm:pt-2"
          >
            <Link
              href={hero.applyNow.href}
              className={buttonVariants({
                variant: "brand",
                size: "pill",
                className: "max-sm:min-w-0 max-sm:flex-1",
              })}
            >
              {hero.applyNow.label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <SaveJobButton
              slug={slug}
              label={hero.saveJob}
              savedLabel={hero.savedJob}
              className="max-sm:size-[52px] max-sm:shrink-0 max-sm:bg-white/14 max-sm:p-0"
            />
          </div>
        ) : (
          <p
            role="status"
            data-intro
            className="max-w-[640px] rounded-2xl bg-white/14 px-5 py-4 text-base text-white"
          >
            {hero.closedNotice}
          </p>
        )}
      </Container>
    </section>
  )
}
