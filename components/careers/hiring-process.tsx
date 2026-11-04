import { Container, SectionHeading } from "@/components/home/section-heading"

import type { HiringProcessProps } from "./types"

/** "Our Hiring Process": numbered steps. */
export function HiringProcess({
  eyebrow,
  title,
  intro,
  steps,
}: HiringProcessProps) {
  return (
    <section className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow={eyebrow} title={title} description={intro} />
        <ol className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.number}
              data-card="light"
              className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-white px-7 py-8"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand font-heading text-xl font-bold text-white">
                {step.number}
              </span>
              <h3 className="font-heading text-[22px]/[1.2] font-bold text-ink">
                {step.title}
              </h3>
              <p className="text-base leading-[1.55] text-body">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
