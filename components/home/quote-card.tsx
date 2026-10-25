import { buttonVariants } from "@/components/ui/button"

/** Sidebar call-to-action shared by service and blog detail pages */
export function QuoteCard() {
  return (
    <div className="flex flex-col gap-3.5 rounded-3xl bg-navy p-8">
      <h2 className="font-heading text-[28px]/[normal] font-bold text-white">
        Need a Quote?
      </h2>
      <p className="text-base leading-[1.6] text-white/85">
        Tell us about your space and we&apos;ll put together a cleaning plan and
        price that suits you.
      </p>
      <a
        href="tel:+353578697670"
        className="text-base/[normal] font-medium text-white hover:text-sky"
      >
        Tel: 057 8697670 Ext 4
      </a>
      <a
        href="#contact"
        className={buttonVariants({
          variant: "brand",
          size: "pill",
          className: "w-full",
        })}
      >
        Get a Free Quote
      </a>
    </div>
  )
}
