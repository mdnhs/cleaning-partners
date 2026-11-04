import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

import type { WhyJoinProps } from "./types"

/** "Why Work With The Clean Team": the four benefit cards. */
export function WhyJoin({ eyebrow, title, description, cards }: WhyJoinProps) {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.title}
              data-card="light"
              className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-white px-7 py-8 shadow-[0px_10px_30px_0px_rgba(13,28,51,0.05)]"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand">
                <Image src={card.icon} alt="" width={26} height={26} />
              </span>
              <h3 className="font-heading text-[22px]/[1.2] font-bold text-ink">
                {card.title}
              </h3>
              <p className="text-base leading-[1.55] text-body">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
