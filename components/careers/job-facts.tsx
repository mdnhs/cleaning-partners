import { Briefcase, Clock, Euro, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"

/** A job's location, type, hours and pay as icon + text facts. */
export function JobFacts({
  location,
  type,
  hours,
  pay,
  className,
}: {
  location: string
  type: string
  hours: string
  pay: string
  className?: string
}) {
  const facts = [
    { icon: MapPin, text: location },
    { icon: Briefcase, text: type },
    { icon: Clock, text: hours },
    { icon: Euro, text: pay },
  ]
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]/[1.5] text-body md:flex md:flex-wrap md:gap-x-5 md:gap-y-2 md:text-[15px]/[1.4]",
        className
      )}
    >
      {facts.map(({ icon: Icon, text }) => (
        <li key={text} className="flex min-w-0 items-center gap-1.5">
          <Icon aria-hidden className="size-4 shrink-0 text-brand" />
          {text}
        </li>
      ))}
    </ul>
  )
}

/** The small rounded labels over a job (category, Open / Closed). */
export function JobPill({
  tone,
  children,
}: {
  tone: "category" | "open" | "closed"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[13px]/[1.5] font-medium md:px-3 md:py-1.5 md:font-heading md:text-[13px]/[1.2] md:font-bold",
        tone === "category" &&
          "bg-[#e6f7fb] text-[#0e93ad] md:bg-brand-soft md:text-brand-deep",
        tone === "open" && "bg-[#e7f6ec] text-[#1e8e4e] md:text-[#1f8a4c]",
        tone === "closed" && "bg-[#eceff3] text-body md:bg-surface"
      )}
    >
      {tone === "open" ? (
        <span
          aria-hidden
          className="size-[7px] rounded-full bg-[#2fb36a] max-md:hidden"
        />
      ) : null}
      {children}
    </span>
  )
}
