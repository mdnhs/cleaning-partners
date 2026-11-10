import { Container } from "@/components/home/section-heading"

export type HowItWorksProps = {
  eyebrow: string
  title: string
  steps: { title: string; description: string }[]
}

export function HowItWorks({ eyebrow, title, steps }: HowItWorksProps) {
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
        </div>

        <ol data-stagger className="grid w-full md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative flex flex-col gap-1 max-md:pt-1.5 max-md:pb-6 max-md:pl-[50px] max-md:last:pb-0 md:gap-3.5 md:rounded-3xl md:border md:border-line md:bg-white md:px-8 md:py-9"
            >
              <span
                data-timeline-badge
                className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white md:static md:size-14 md:text-xl/[normal] md:font-extrabold"
              >
                {String(i + 1).padStart(2, "0")}
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
