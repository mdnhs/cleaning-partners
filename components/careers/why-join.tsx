import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

import type { WhyJoinProps } from "./types"

/** "Why Work With The Clean Team": the four benefit cards. */
export function WhyJoin({ eyebrow, title, description, cards }: WhyJoinProps) {
  return (
    <section className="bg-white py-12 md:py-28">
      <Container className="flex flex-col items-start gap-5 sm:items-center sm:gap-14">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="max-sm:items-start max-sm:text-left"
        />
        <ul
          data-stagger
          className="grid w-full grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4"
        >
          {cards.map((card) => (
            <li
              key={card.title}
              data-card="light"
              className="flex min-h-[216px] flex-col items-start gap-2.5 rounded-[18px] bg-surface p-4 sm:min-h-0 sm:gap-4 sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:px-7 sm:py-8 sm:shadow-[0px_10px_30px_0px_rgba(13,28,51,0.05)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand sm:size-14 sm:rounded-2xl">
                <Image
                  src={card.icon}
                  alt=""
                  width={26}
                  height={26}
                  className="size-5 sm:size-[26px]"
                />
              </span>
              <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink sm:text-[22px]/[1.2]">
                {card.title}
              </h3>
              <p className="text-[13px] leading-[1.5] text-body sm:text-base sm:leading-[1.55]">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
