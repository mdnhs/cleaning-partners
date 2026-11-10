import { PhoneIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export type QuoteCardProps = {
  title: string
  body: string
  tel: { label: string; href: string }
  cta: { label: string; href: string }
}

/** Sidebar call-to-action shared by service and blog detail pages */
export function QuoteCard({ title, body, tel, cta }: QuoteCardProps) {
  return (
    <div
      data-reveal
      className="flex flex-col gap-3 rounded-[20px] bg-navy p-6 md:gap-3.5 md:rounded-3xl md:p-8"
    >
      <h2 className="font-heading text-xl/[1.25] font-bold text-white md:text-[28px]/[normal]">
        {title}
      </h2>
      <p className="text-sm leading-[1.55] text-white/85 md:text-base md:leading-[1.6]">
        {body}
      </p>
      <a
        href={tel.href}
        className="flex items-center gap-2 text-[15px]/[1.45] font-medium text-white hover:text-sky md:text-base/[normal]"
      >
        <PhoneIcon aria-hidden className="size-4 md:hidden" />
        {tel.label}
      </a>
      <a
        href={cta.href}
        className={buttonVariants({
          variant: "brand",
          size: "pill",
          className: "w-full",
        })}
      >
        {cta.label}
      </a>
    </div>
  )
}
