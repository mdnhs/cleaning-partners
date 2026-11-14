import { Container, SectionHeading } from "@/components/home/section-heading"

export type StepsSectionProps = {
  eyebrow: string
  title: string
  intro?: string
  steps: { title: string; description: string }[]
  /**
   * compact: three columns from md, round badges (a service page's
   * "How it works"). wide: two then four columns, light cards, square
   * badges (the careers hiring process).
   */
  variant: "compact" | "wide"
}

const badge = (i: number) => String(i + 1).padStart(2, "0")

/** Numbered steps: a timeline on phones, cards from the breakpoint up. */
export function StepsSection(props: StepsSectionProps) {
  return props.variant === "wide" ? (
    <WideSteps {...props} />
  ) : (
    <CompactSteps {...props} />
  )
}

function CompactSteps({ eyebrow, title, intro, steps }: StepsSectionProps) {
  return (
    <section className="bg-surface py-12 md:py-28">
      <Container className="flex flex-col items-start gap-6 md:items-center md:gap-14">
        <div className="flex max-w-[760px] flex-col gap-2 text-left md:gap-3 md:text-center">
          <p
            data-reveal
            className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[1.5px]"
          >
            {eyebrow}
          </p>
          <h2
            data-split
            className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-5xl md:tracking-normal"
          >
            {title}
          </h2>
          {intro && (
            <p
              data-reveal
              className="text-base leading-[1.6] text-body sm:text-lg"
            >
              {intro}
            </p>
          )}
        </div>

        <ol data-stagger className="grid w-full md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <li
              key={i}
              className="relative flex flex-col gap-1 max-md:pt-1.5 max-md:pb-6 max-md:pl-[50px] max-md:last:pb-0 md:gap-3.5 md:rounded-3xl md:border md:border-line md:bg-white md:px-8 md:py-9"
            >
              <span
                data-timeline-badge
                className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white md:static md:size-14 md:text-xl/[normal] md:font-extrabold"
              >
                {badge(i)}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  data-timeline-line
                  className="absolute top-[42px] bottom-0 left-[17px] w-0.5 bg-[#cfe3ec] md:hidden"
                />
              )}
              <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink md:text-2xl/[normal]">
                {step.title}
              </h3>
              <p className="text-sm leading-[1.55] text-body md:text-base md:leading-[1.6]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

function WideSteps({ eyebrow, title, intro, steps }: StepsSectionProps) {
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
              key={i}
              data-card="light"
              className="relative flex flex-col items-start gap-1 max-sm:pt-1.5 max-sm:pb-6 max-sm:pl-[50px] max-sm:last:pb-0 sm:gap-4 sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:px-7 sm:py-8"
            >
              <span
                data-timeline-badge
                className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white sm:static sm:size-14 sm:rounded-2xl sm:text-xl sm:font-bold"
              >
                {badge(i)}
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
