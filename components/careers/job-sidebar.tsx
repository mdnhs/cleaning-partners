import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  Clock,
  Euro,
  Hash,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

import { ShareJobButton } from "./share-job-button"
import type { JobDetailView } from "./types"

const ROW_ICONS: Record<string, LucideIcon> = {
  reference: Hash,
  location: MapPin,
  type: Briefcase,
  hours: Clock,
  pay: Euro,
  start: CalendarDays,
  closing: CalendarClock,
}

/** Job Summary, Questions and Before You Apply cards. */
export function JobSidebar({
  sidebar,
  title,
  open,
  checkIcon,
}: {
  sidebar: JobDetailView["sidebar"]
  title: string
  open: boolean
  checkIcon: string
}) {
  return (
    <aside className="flex flex-col gap-4 md:gap-6 lg:sticky lg:top-28 lg:self-start">
      <section
        data-reveal
        className="flex flex-col gap-5 rounded-[20px] border border-line bg-white p-5 md:rounded-3xl md:p-6 md:shadow-[0px_10px_30px_0px_rgba(13,28,51,0.06)]"
      >
        <h2 className="font-heading text-xl font-bold text-ink">
          {sidebar.summaryTitle}
        </h2>
        <dl className="flex flex-col gap-4">
          {sidebar.rows.map((row) => {
            const Icon = ROW_ICONS[row.icon] ?? Hash
            return (
              <div key={row.icon} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="flex flex-col">
                  <dt className="text-[13px] text-subtle">{row.label}</dt>
                  <dd className="font-heading text-base font-semibold text-ink">
                    {row.value}
                  </dd>
                </div>
              </div>
            )
          })}
        </dl>
        {open ? (
          <Link
            href={sidebar.apply.href}
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "w-full",
            })}
          >
            {sidebar.apply.label}
          </Link>
        ) : null}
        <ShareJobButton
          label={sidebar.share}
          copiedLabel={sidebar.linkCopied}
          title={title}
        />
      </section>

      <section
        data-reveal
        className="flex flex-col gap-3.5 rounded-[20px] bg-[#1c3f5a] p-5 text-white md:gap-4 md:rounded-3xl md:bg-navy md:p-6"
      >
        <h2 className="font-heading text-xl font-bold">
          {sidebar.questionsTitle}
        </h2>
        <p className="text-[15px] leading-[1.6] text-white/85">
          {sidebar.questionsBody}
        </p>
        {[
          { icon: Phone, link: sidebar.phone },
          { icon: Mail, link: sidebar.email },
        ].map(({ icon: Icon, link }) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 font-heading text-[15px] font-semibold transition-colors hover:bg-white/15"
          >
            <Icon aria-hidden className="size-4" />
            {link.label}
          </a>
        ))}
      </section>

      <section
        data-reveal
        className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 md:rounded-3xl md:p-6"
      >
        <h2 className="font-heading text-lg font-bold text-ink">
          {sidebar.beforeTitle}
        </h2>
        <p className="text-[15px] text-body">{sidebar.beforeIntro}</p>
        <ul className="flex flex-col gap-2.5">
          {sidebar.beforeItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[15px] leading-[1.5] text-ink-soft"
            >
              <Image
                src={checkIcon}
                alt=""
                width={18}
                height={18}
                className="mt-0.5 shrink-0"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
