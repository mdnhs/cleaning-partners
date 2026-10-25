import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"

type CtaLink = { label: string; href: string }

export type HeroProps = {
  background: string
  logo: { src: string; alt: string }
  title: string
  subtitle: string
  primaryCta: CtaLink
  secondaryCta: CtaLink
  member: { label: string; logo: string; logoAlt: string }
}

export function Hero({
  background,
  logo,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  member,
}: HeroProps) {
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src={background}
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
        className="flex min-h-[700px] flex-col items-center justify-center gap-6 py-16 text-center"
      >
        <div
          data-intro
          data-hero-badge
          className="flex size-[180px] items-center justify-center rounded-full bg-white/92 md:size-[220px]"
        >
          <div className="relative h-[130px] w-[146px] md:h-40 md:w-[180px]">
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="180px"
              className="object-contain"
              preload
            />
          </div>
        </div>

        <h1
          data-intro
          data-hero-title
          className="font-heading text-[44px] leading-[1.05] font-bold text-white md:text-[64px]"
        >
          {title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[640px] text-lg leading-[1.55] text-white/90 md:text-xl"
        >
          {subtitle}
        </p>

        <div
          data-intro
          data-hero-actions
          className="flex flex-wrap justify-center gap-4 pt-2"
        >
          <a
            href={primaryCta.href}
            className={buttonVariants({ variant: "brand", size: "pill" })}
          >
            {primaryCta.label}
          </a>
          <a
            href={secondaryCta.href}
            className={buttonVariants({
              variant: "outline-light",
              size: "pill",
            })}
          >
            {secondaryCta.label}
          </a>
        </div>

        <div
          data-intro
          data-hero-member
          className="flex items-center gap-3 pt-3"
        >
          <p className="text-sm font-medium text-white/80">{member.label}</p>
          <div className="relative h-[42px] w-20">
            <Image
              src={member.logo}
              alt={member.logoAlt}
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
        </div>
      </Container>
    </section>
  )
}
