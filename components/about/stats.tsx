import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

export type StatsProps = {
  stats: { value: string; label: string }[]
}

export function Stats({ stats }: StatsProps) {
  return (
    <section className="bg-navy py-10 lg:py-[72px]">
      <Container>
        <ul
          data-stagger
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6 lg:text-center"
        >
          {stats.map((stat) => (
            <li
              key={stat.value}
              className="flex min-h-[130px] flex-col items-start gap-1.5 rounded-[18px] border border-white/15 bg-white/8 px-4 py-[18px] lg:min-h-0 lg:items-center lg:gap-2 lg:rounded-3xl lg:border-white/18 lg:px-6 lg:py-8"
            >
              <p
                data-countup
                className={cn(
                  "font-heading font-extrabold text-white",
                  // Long word steps down so it fits the card
                  stat.value.length > 4
                    ? "text-[26px]/none lg:text-[40px]/[normal]"
                    : "text-[34px]/none lg:text-[56px]/[normal]"
                )}
              >
                {stat.value}
              </p>
              <p className="text-[13px] leading-[1.5] text-white/85 lg:text-base">
                {stat.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
