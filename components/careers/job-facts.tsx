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
        "flex flex-wrap gap-x-5 gap-y-2 text-[15px]/[1.4] text-body",
        className
      )}
    >
      {facts.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-1.5">
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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-heading text-[13px]/[1.2] font-bold",
        tone === "category" && "bg-brand-soft text-brand-deep",
        tone === "open" && "bg-[#e7f6ec] text-[#1f8a4c]",
        tone === "closed" && "bg-surface text-body"
      )}
    >
      {tone === "open" ? (
        <span aria-hidden className="size-[7px] rounded-full bg-[#2fb36a]" />
      ) : null}
      {children}
    </span>
  )
}
