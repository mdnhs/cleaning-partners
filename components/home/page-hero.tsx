import { Fragment } from "react"
import Image from "next/image"
import Link from "next/link"

import { Container } from "@/components/home/section-heading"

type Crumb = { label: string; href: string }

export type PageHeroProps = {
  crumb: string
  /** Pages between Home and the current one */
  parents?: Crumb[]
  title: string
  description: string
  image: string
  /** The breadcrumb's first crumb */
  home: Crumb
  /** Accessible name of the breadcrumb */
  ariaLabel: string
}

export function PageHero({
  crumb,
  parents = [],
  title,
  description,
  image,
  home,
  ariaLabel,
}: PageHeroProps) {
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          preload
        />
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(40,100,143,0.55)] to-[rgba(15,47,71,0.8)]" />
      </div>

      <Container
        data-hero-content
        className="flex min-h-[460px] flex-col items-center justify-center gap-5 py-16 text-center"
      >
        <nav
          aria-label={ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap items-center justify-center gap-2.5 rounded-full bg-white/14 px-[18px] py-2 font-heading text-[15px]/[normal]"
        >
          {[home, ...parents].map((parent) => (
            <Fragment key={parent.href}>
              <Link
                href={parent.href}
                className="font-medium text-white/80 transition-colors hover:text-white"
              >
                {parent.label}
              </Link>
              <span aria-hidden className="font-medium text-white/50">
                /
              </span>
            </Fragment>
          ))}
          <span aria-current="page" className="font-bold text-white">
            {crumb}
          </span>
        </nav>

        <h1
          data-intro
          data-hero-title
          className="font-heading text-[44px] leading-[normal] font-bold text-white md:text-[64px]"
        >
          {title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[720px] text-lg leading-[1.5] text-white/92 md:text-xl"
        >
          {description}
        </p>
      </Container>
    </section>
  )
}
