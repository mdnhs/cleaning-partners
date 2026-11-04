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
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div
          data-reveal
          className="flex flex-col gap-8 rounded-[28px] bg-navy-dark px-8 py-12 md:flex-row md:items-center md:justify-between md:px-14"
        >
          <div className="flex max-w-[640px] flex-col gap-3">
            <p className="font-heading text-[15px]/[normal] font-bold tracking-[2.1px] text-brand">
              {eyebrow}
            </p>
            <h2 className="font-heading text-3xl/[1.15] font-bold text-white md:text-[40px]">
              {title}
            </h2>
            <p className="text-base leading-[1.6] text-white/80">{body}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
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
