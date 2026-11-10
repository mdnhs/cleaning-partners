import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { renderInline } from "@/lib/rich-text/render"
import type { ParagraphsDoc } from "@/lib/schemas/common"

type Picture = { src: string; alt: string }

export type OurStoryProps = {
  imageA: Picture
  imageB: Picture
  eyebrow: string
  title: string
  paragraphs: ParagraphsDoc
  sectorsHeading: string
  sectors: string[]
  cta: { label: string; href: string }
}

export function OurStory({
  imageA,
  imageB,
  eyebrow,
  title,
  paragraphs,
  sectorsHeading,
  sectors,
  cta,
}: OurStoryProps) {
  // The first paragraph is the intro: under the heading on mobile
  const [first, ...rest] = paragraphs.content
  return (
    <section className="bg-white py-12 lg:py-28">
      <Container className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-16">
        <div
          data-stagger
          className="order-2 flex w-full max-w-[580px] shrink-0 gap-3 sm:gap-5 lg:order-none lg:w-auto"
        >
          <div className="relative h-[200px] flex-1 overflow-hidden rounded-[20px] sm:rounded-[28px] lg:h-[440px] lg:w-[280px] lg:flex-none">
            <Image
              src={imageA.src}
              alt={imageA.alt}
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex-1 pt-6 sm:pt-[60px] lg:flex-none">
            <div className="relative h-[200px] overflow-hidden rounded-[20px] sm:rounded-[28px] lg:h-[440px] lg:w-[280px]">
              <Image
                src={imageB.src}
                alt={imageB.alt}
                fill
                sizes="(min-width: 1024px) 280px, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:items-start lg:gap-[22px]">
          <div className="order-1 flex w-full flex-col gap-5 lg:gap-[22px]">
            <div className="flex w-full flex-col gap-2 lg:gap-3">
              <p
                data-reveal
                className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand lg:text-[15px]/[normal] lg:tracking-[1.5px]"
              >
                {eyebrow}
              </p>
              <h2
                data-split
                className="font-heading text-[28px] leading-[1.15] font-bold text-ink lg:text-4xl lg:leading-[1.15] xl:text-5xl"
              >
                {title}
              </h2>
              {first ? (
                <p
                  data-reveal
                  className="text-base leading-[1.6] text-body lg:hidden"
                >
                  {renderInline(first.content)}
                </p>
              ) : null}
            </div>
            {first ? (
              <p
                data-reveal
                className="hidden text-[17px] leading-[1.65] text-body lg:block"
              >
                {renderInline(first.content)}
              </p>
            ) : null}
          </div>

          {rest.map((paragraph, i) => (
            <p
              key={i}
              data-reveal
              className="order-3 text-[15px] leading-[1.6] text-body lg:text-[17px] lg:leading-[1.65]"
            >
              {renderInline(paragraph.content)}
            </p>
          ))}

          <div data-reveal className="order-3 flex w-full flex-col gap-3">
            <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink lg:text-lg/[normal]">
              {sectorsHeading}
            </h3>
            <ul className="flex flex-wrap gap-2 lg:gap-2.5">
              {sectors.map((sector) => (
                <li
                  key={sector}
                  className="rounded-full border border-line bg-white px-3.5 py-[9px] font-heading text-sm/[1.3] font-semibold text-ink lg:bg-surface lg:px-[18px] lg:py-2.5 lg:text-[15px]/[normal] lg:text-navy"
                >
                  {sector}
                </li>
              ))}
            </ul>
          </div>

          <a
            data-reveal
            href={cta.href}
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "order-3 max-lg:w-full",
            })}
          >
            {cta.label}
          </a>
        </div>
      </Container>
    </section>
  )
}
