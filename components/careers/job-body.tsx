import { Info } from "lucide-react"
import Image from "next/image"

import type { JobOfferIcon } from "@/lib/schemas/content/job"

import { OFFER_ICONS } from "./offer-icon"
import type { JobDetailView } from "./types"

function Ticks({ items, icon }: { items: string[]; icon: string }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-base leading-[1.6] text-ink-soft"
        >
          <Image
            src={icon}
            alt=""
            width={20}
            height={20}
            className="mt-1 shrink-0"
          />
          {item}
        </li>
      ))}
    </ul>
  )
}

const H2_CLASS = "font-heading text-[28px]/[1.2] font-bold text-ink"

/** The main column of a job page. */
export function JobBody({ body }: { body: JobDetailView["body"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 data-reveal className={H2_CLASS}>
          {body.aboutTitle}
        </h2>
        {body.about.map((paragraph) => (
          <p
            key={paragraph}
            data-reveal
            className="text-[17px] leading-[1.7] text-body"
          >
            {paragraph}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-5">
        <h2 data-reveal className={H2_CLASS}>
          {body.responsibilitiesTitle}
        </h2>
        <Ticks items={body.responsibilities} icon={body.checkIcon} />
      </section>

      <section className="flex flex-col gap-5">
        <h2 data-reveal className={H2_CLASS}>
          {body.lookingForTitle}
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              [body.essentialTitle, body.requiredPill, body.essential],
              [body.desirableTitle, body.nicePill, body.desirable],
            ] as const
          )
            .filter(([, , items]) => items.length > 0)
            .map(([title, pill, items]) => (
              <div
                key={title}
                data-card="light"
                className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-heading text-xl font-bold text-ink">
                    {title}
                  </h3>
                  <span className="rounded-full bg-surface px-3 py-1 font-heading text-[13px] font-semibold text-navy">
                    {pill}
                  </span>
                </div>
                <Ticks items={[...items]} icon={body.checkIcon} />
              </div>
            ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 data-reveal className={H2_CLASS}>
          {body.offerTitle}
        </h2>
        <p data-reveal className="text-[17px] leading-[1.7] text-body">
          {body.offerIntro}
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {body.offers.map((offer) => {
            const Icon = OFFER_ICONS[offer.icon as JobOfferIcon]
            return (
              <li
                key={offer.text}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium text-ink"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                {offer.text}
              </li>
            )
          })}
        </ul>
      </section>

      <p className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-5 py-4 text-[15px] leading-[1.6] text-ink-soft">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-deep" />
        {body.equalOpportunities}
      </p>
    </div>
  )
}
