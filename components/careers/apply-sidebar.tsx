import {
  ArrowRight,
  Briefcase,
  Clock,
  Euro,
  Lock,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import Link from "next/link"

import type { ApplyView } from "./types"

const CARD_CLASS = "flex flex-col rounded-3xl border border-line p-7"

/** Beside the form: the job, what happens next, data and help (Figma 498:532). */
export function ApplySidebar({
  job,
  sidebar,
}: {
  job: ApplyView["job"]
  sidebar: ApplyView["sidebar"]
}) {
  const facts = job
    ? [
        { icon: MapPin, text: job.facts.location },
        { icon: Briefcase, text: job.facts.type },
        { icon: Clock, text: job.facts.hours },
        { icon: Euro, text: job.facts.pay },
      ]
    : []
  const contacts = [
    { icon: Phone, link: sidebar.phone },
    { icon: Mail, link: sidebar.email },
  ]
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
      {job ? (
        <div className="flex flex-col gap-4 rounded-3xl bg-navy-dark p-7">
          <p className="font-heading text-sm leading-[1.2] font-bold tracking-[0.5px] text-brand uppercase">
            {sidebar.applyingFor}
          </p>
          <p className="font-heading text-[25px] leading-[1.2] font-bold text-white">
            {job.title}
          </p>
          <ul className="flex flex-col gap-4">
            {facts.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2.5 text-[15px] leading-[1.3] text-white/85"
              >
                <Icon aria-hidden className="size-[18px] shrink-0 text-brand" />
                {text}
              </li>
            ))}
          </ul>
          <Link
            href={job.href}
            className="inline-flex w-fit items-center gap-2 font-heading text-base leading-[1.2] font-bold text-brand hover:underline"
          >
            {sidebar.viewJob}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : null}

      <div className={`${CARD_CLASS} gap-[18px] bg-white`}>
        <h2 className="font-heading text-[21px] leading-[1.2] font-bold text-ink">
          {sidebar.nextTitle}
        </h2>
        <ol className="flex flex-col gap-[18px]">
          {sidebar.nextSteps.map((step) => (
            <li key={step.number} className="flex items-start gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e6f7fb] font-heading text-[15px] font-extrabold text-[#0b88a3]">
                {step.number}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-heading text-[17px] leading-[1.3] font-bold text-ink">
                  {step.title}
                </span>
                <span className="text-sm leading-[1.45] text-body">
                  {step.description}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={`${CARD_CLASS} gap-3 bg-surface`}>
        <h2 className="flex items-center gap-2.5 font-heading text-[19px] leading-[1.2] font-bold text-ink">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#e6f7fb]">
            <Lock aria-hidden className="size-4 text-brand-deep" />
          </span>
          {sidebar.dataTitle}
        </h2>
        <p className="text-sm leading-[1.5] text-body">{sidebar.dataBody}</p>
      </div>

      <div className={`${CARD_CLASS} gap-3.5 bg-white`}>
        <h2 className="font-heading text-[19px] leading-[1.2] font-bold text-ink">
          {sidebar.helpTitle}
        </h2>
        {contacts.map(({ icon: Icon, link }) => (
          <a
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 font-heading text-base leading-[1.3] font-semibold text-ink"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand transition-colors group-hover:bg-brand-deep">
              <Icon aria-hidden className="size-4 text-white" />
            </span>
            <span className="group-hover:text-brand-deep">{link.label}</span>
          </a>
        ))}
      </div>
    </aside>
  )
}
