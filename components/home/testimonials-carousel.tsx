"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Item = {
  name: string
  initials: string
  quote: string
  stars: string
  starsAria: string
}

/**
 * The testimonials as a swipeable strip: one card on a phone, two on a
 * tablet, three on a desktop. Native scroll-snap does the moving (touch,
 * trackpad and keyboard scrolling all work); the arrows scroll by one card
 * and disable at either end. Without script it is still a scrollable strip.
 */
export function TestimonialsCarousel({
  label,
  prevLabel,
  nextLabel,
  verifiedLabel,
  items,
}: {
  label: string
  prevLabel: string
  nextLabel: string
  verifiedLabel: string
  items: Item[]
}) {
  const track = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    measure()
    const el = track.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const move = (direction: 1 | -1) => {
    const el = track.current
    const card = el?.firstElementChild as HTMLElement | null
    if (!el || !card) return
    const step =
      card.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0)
    el.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  const arrow =
    "inline-flex size-12 items-center justify-center rounded-full border border-line bg-white text-navy transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="flex w-full flex-col gap-8 max-sm:gap-0"
    >
      <ul
        ref={track}
        data-testimonial-track
        onScroll={measure}
        tabIndex={0}
        aria-label={label}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] motion-reduce:scroll-auto max-sm:-mx-5 max-sm:scroll-px-5 max-sm:px-5 max-sm:pb-0 sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t) => (
          <li
            key={t.name}
            className="flex min-h-[326px] shrink-0 basis-[300px] snap-start flex-col gap-4 rounded-[20px] bg-surface p-6 sm:min-h-0 sm:basis-full sm:gap-[18px] sm:rounded-3xl sm:px-8 sm:py-9 md:basis-[calc(50%-12px)] lg:basis-[calc(33.333%-16px)]"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="font-heading text-[56px] leading-[0.6] font-extrabold text-brand sm:text-[64px]"
              >
                “
              </span>
              <span
                role="img"
                aria-label={t.starsAria}
                className="text-base text-star sm:text-lg"
              >
                {t.stars}
              </span>
            </div>
            <blockquote className="flex-1 text-[15px] leading-[1.6] text-ink-soft sm:text-base sm:leading-[1.65]">
              {t.quote}
            </blockquote>
            <div className="flex items-center gap-3 sm:gap-3.5 sm:pt-[19px]">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-base font-bold text-white sm:size-12 sm:text-lg">
                {t.initials}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-heading text-[17px]/[1.3] font-bold text-ink sm:text-lg/[normal]">
                  {t.name}
                </p>
                <p className="text-[13px]/[normal] text-body">
                  {verifiedLabel}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div
        className={cn("flex items-center justify-center gap-3 max-sm:hidden")}
      >
        <button
          type="button"
          aria-label={prevLabel}
          disabled={edge.start}
          onClick={() => move(-1)}
          className={arrow}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={edge.end}
          onClick={() => move(1)}
          className={arrow}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
    </div>
  )
}
