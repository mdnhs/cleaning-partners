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
    const step = card.offsetWidth + 24
    el.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  const arrow =
    "inline-flex size-12 items-center justify-center rounded-full border border-line bg-white text-navy transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="flex w-full flex-col gap-8"
    >
      <ul
        ref={track}
        onScroll={measure}
        tabIndex={0}
        aria-label={label}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t) => (
          <li
            key={t.name}
            className="flex shrink-0 basis-full snap-start flex-col gap-[18px] rounded-3xl bg-surface px-8 py-9 md:basis-[calc(50%-12px)] lg:basis-[calc(33.333%-16px)]"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="font-heading text-[64px] leading-[0.6] font-extrabold text-brand"
              >
                “
              </span>
              <span
                role="img"
                aria-label={t.starsAria}
                className="text-lg text-star"
              >
                {t.stars}
              </span>
            </div>
            <blockquote className="flex-1 text-base leading-[1.65] text-ink-soft">
              {t.quote}
            </blockquote>
            <div className="flex items-center gap-3.5 pt-[19px]">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-lg font-bold text-white">
                {t.initials}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-heading text-lg/[normal] font-bold text-ink">
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

      <div className={cn("flex items-center justify-center gap-3")}>
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
