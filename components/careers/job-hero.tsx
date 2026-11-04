import { ArrowRight, Briefcase, Clock, Euro, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Fragment } from "react"

import { Container } from "@/components/home/section-heading"
import { buttonVariants } from "@/components/ui/button"

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
        className="flex min-h-[520px] flex-col items-center justify-center gap-5 py-16 text-center"
      >
        <nav
          aria-label={hero.crumbs.ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap items-center justify-center gap-2.5 rounded-full bg-white/14 px-[18px] py-2 font-heading text-[15px]/[normal]"
        >
          {[hero.crumbs.home, hero.crumbs.careers].map((crumb) => (
            <Fragment key={crumb.href}>
              <Link
                href={crumb.href}
                className="font-medium text-white/80 transition-colors hover:text-white"
              >
                {crumb.label}
              </Link>
              <span aria-hidden className="font-medium text-white/50">
                /
              </span>
            </Fragment>
          ))}
          <span aria-current="page" className="font-bold text-white">
            {hero.title}
          </span>
        </nav>
        <div
          data-intro
          data-hero-copy
          className="flex flex-wrap justify-center gap-2"
        >
          {open ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f6ec] px-3 py-1.5 font-heading text-[13px] font-bold text-[#1f8a4c]">
              <span
                aria-hidden
                className="size-[7px] rounded-full bg-[#2fb36a]"
              />
              {hero.nowHiring}
            </span>
          ) : null}
          <span className="rounded-full bg-brand-soft px-3 py-1.5 font-heading text-[13px] font-bold text-brand-deep">
            {hero.category}
          </span>
        </div>
        <h1
          data-intro
          data-hero-title
          className="font-heading text-[40px] leading-[1.1] font-bold text-white md:text-[60px]"
        >
          {hero.title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[720px] text-lg leading-[1.5] text-white/92 md:text-xl"
        >
          {hero.summary}
        </p>
        <ul
          data-intro
          data-hero-copy
          className="flex flex-wrap justify-center gap-3"
        >
          {facts.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-[15px] text-white"
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
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            <Link
              href={hero.applyNow.href}
              className={buttonVariants({
                variant: "brand",
                size: "pill",
                className: "max-sm:w-full",
              })}
            >
              {hero.applyNow.label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <SaveJobButton
              slug={slug}
              label={hero.saveJob}
              savedLabel={hero.savedJob}
              className="max-sm:w-full"
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
