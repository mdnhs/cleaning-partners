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
    <div className="flex flex-col gap-3.5 rounded-3xl bg-navy p-8">
      <h2 className="font-heading text-[28px]/[normal] font-bold text-white">
        {title}
      </h2>
      <p className="text-base leading-[1.6] text-white/85">{body}</p>
      <a
        href={tel.href}
        className="text-base/[normal] font-medium text-white hover:text-sky"
      >
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
