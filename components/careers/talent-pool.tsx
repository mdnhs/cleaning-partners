import { ArrowRight, Phone } from "lucide-react"
import Link from "next/link"

import { Container } from "@/components/home/section-heading"
import { buttonVariants } from "@/components/ui/button"

import type { TalentPoolProps } from "./types"

/** The navy "Don’t see the right role?" banner. */
export function TalentPool({
  eyebrow,
  title,
  body,
  cta,
  call,
}: TalentPoolProps) {
  return (
    <section className="bg-white py-12 md:py-24">
      <Container>
        <div
          data-reveal
          className="flex flex-col gap-3.5 rounded-3xl bg-[#1c3f5a] p-6 sm:gap-8 sm:rounded-[28px] sm:bg-navy-dark sm:px-8 sm:py-12 md:flex-row md:items-center md:justify-between md:px-14"
        >
          <div className="flex max-w-[640px] flex-col gap-3.5 sm:gap-3">
            <p className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand sm:text-[15px]/[normal] sm:tracking-[2.1px]">
              {eyebrow}
            </p>
            <h2 className="font-heading text-[28px]/[1.15] font-bold tracking-[-0.084px] text-white sm:text-3xl sm:tracking-normal md:text-[40px]">
              {title}
            </h2>
            <p className="text-sm leading-[1.55] text-white/85 sm:text-base sm:leading-[1.6] sm:text-white/80">
              {body}
            </p>
          </div>
          <div className="flex flex-col gap-3.5 sm:flex-row sm:gap-3 md:shrink-0">
            <Link
              href={cta.href}
              className={buttonVariants({
                variant: "brand",
                size: "pill",
                className: "max-sm:w-full",
              })}
            >
              {cta.label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a
              href={call.href}
              className={buttonVariants({
                variant: "outline-light",
                size: "pill",
                className: "max-sm:w-full",
              })}
            >
              <Phone aria-hidden className="size-4" />
              {call.label}
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
