"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Pagination dots for a strip that scrolls sideways on a phone: the dot of
 * the card nearest the start is the long one. Purely a position indicator
 * (hidden from assistive technology); the strip itself stays the control.
 * `target` is a CSS selector for the scrolling element.
 */
export function ScrollDots({
  target,
  count,
  tone = "light",
  className,
}: {
  target: string
  count: number
  tone?: "light" | "dark"
  className?: string
}) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(target)
    if (!el) return
    const update = () => {
      const first = el.firstElementChild as HTMLElement | null
      if (!first) return
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0
      const step = first.offsetWidth + gap
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      const index = atEnd ? count - 1 : Math.round(el.scrollLeft / step)
      setActive(Math.min(count - 1, Math.max(0, index)))
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    return () => el.removeEventListener("scroll", update)
  }, [target, count])

  return (
    <div
      aria-hidden
      className={cn("flex items-center gap-1.5 md:hidden", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-[3px] transition-[width,background-color] duration-200",
            i === active ? "w-[22px]" : "w-1.5",
            tone === "dark"
              ? i === active
                ? "bg-brand"
                : "bg-[#cfe3ec]"
              : i === active
                ? "bg-white"
                : "bg-white/35"
          )}
        />
      ))}
    </div>
  )
}
