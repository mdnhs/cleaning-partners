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
    <section className="bg-surface py-12 md:py-28">
      <Container className="flex flex-col items-start gap-6 sm:items-center sm:gap-14">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={intro}
          className="max-sm:items-start max-sm:text-left"
        />
        <ol
          data-stagger
          className="grid w-full sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
        >
          {steps.map((step, i) => (
            <li
              key={step.number}
              data-card="light"
              className="relative flex flex-col items-start gap-1 max-sm:pt-1.5 max-sm:pb-6 max-sm:pl-[50px] max-sm:last:pb-0 sm:gap-4 sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:px-7 sm:py-8"
            >
              <span
                data-timeline-badge
                className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white sm:static sm:size-14 sm:rounded-2xl sm:text-xl sm:font-bold"
              >
                {step.number}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  data-timeline-line
                  className="absolute top-[42px] bottom-0 left-[17px] w-0.5 bg-[#cfe3ec] sm:hidden"
                />
              )}
              <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink sm:text-[22px]/[1.2]">
                {step.title}
              </h3>
              <p className="text-sm leading-[1.55] text-body sm:text-base">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
