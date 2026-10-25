import { Container } from "@/components/home/section-heading"

export type HowItWorksProps = {
  eyebrow: string
  title: string
  steps: { title: string; description: string }[]
}

export function HowItWorks({ eyebrow, title, steps }: HowItWorksProps) {
  return (
    <section className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <div className="flex max-w-[760px] flex-col gap-3 text-center">
          <p
            data-reveal
            className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
          >
            {eyebrow}
          </p>
          <h2
            data-split
            className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
          >
            {title}
          </h2>
        </div>

        <ol data-stagger className="grid w-full gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-3.5 rounded-3xl border border-line bg-white px-8 py-9"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-brand font-heading text-xl/[normal] font-extrabold text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-2xl/[normal] font-bold text-ink">
                {step.title}
              </h3>
              <p className="text-base leading-[1.6] text-body">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
