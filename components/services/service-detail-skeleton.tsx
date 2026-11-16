import { Container } from "@/components/home/section-heading"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * What a service page shows the moment its link is clicked, until the page
 * streams in: the hero band and the overview's shape. Same widths and
 * heights as the real sections, so the swap does not move the page.
 */
export function ServiceDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="bg-white text-ink"
    >
      <section className="bg-linear-to-b from-[#28648f] to-[#0f2f47]">
        <Container className="flex flex-col items-start gap-4 pt-6 pb-8 sm:min-h-[460px] sm:items-center sm:justify-center sm:py-16">
          <Skeleton className="h-6 w-48 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-4/5 max-w-xl bg-white/20 sm:h-14" />
          <Skeleton className="h-4 w-3/5 max-w-lg bg-white/15" />
        </Container>
      </section>
      <Container className="grid gap-8 py-12 sm:py-20 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-4/5" : "h-4"} />
          ))}
          <Skeleton className="mt-4 aspect-video w-full rounded-2xl" />
        </div>
        <Skeleton className="hidden h-72 rounded-2xl lg:block" />
      </Container>
    </div>
  )
}
