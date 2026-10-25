import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

const stats = [
  { value: "15+", label: "Years of combined experience" },
  { value: "5", label: "Sectors served, from HSE to residential" },
  { value: "24hr", label: "Contact line: (085) 8062369" },
  { value: "Nationwide", label: "Homes and businesses across Ireland" },
]

export function Stats() {
  return (
    <section className="bg-navy py-[72px]">
      <Container>
        <ul
          data-stagger
          className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <li
              key={stat.value}
              className="flex flex-col items-center gap-2 rounded-3xl border border-white/18 bg-white/8 px-6 py-8"
            >
              <p
                className={cn(
                  "font-heading font-extrabold text-white",
                  // Long word steps down so it fits the card
                  stat.value.length > 4
                    ? "text-[40px]/[normal]"
                    : "text-[56px]/[normal]"
                )}
              >
                {stat.value}
              </p>
              <p className="text-base leading-[1.5] text-white/85">
                {stat.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
