import { cn } from "@/lib/utils"

type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  align?: "left" | "center"
  tone?: "default" | "inverted"
  className?: string
  titleClassName?: string
  eyebrowClassName?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "default",
  className,
  titleClassName,
  eyebrowClassName,
}: SectionHeadingProps) {
  const inverted = tone === "inverted"

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 sm:gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className
      )}
    >
      <p
        data-reveal
        className={cn(
          "font-heading text-xs/[1.2] font-bold tracking-[1.44px] sm:text-[15px]/[normal] sm:tracking-[2.1px]",
          inverted ? "text-sky" : "text-brand",
          eyebrowClassName
        )}
      >
        {eyebrow}
      </p>
      <h2
        data-split
        className={cn(
          "font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] sm:text-4xl sm:leading-[1.1] sm:tracking-normal md:text-5xl",
          inverted ? "text-white" : "text-ink",
          titleClassName
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          data-reveal
          className={cn(
            "text-base leading-[1.6] sm:text-lg",
            inverted ? "text-sky-soft" : "text-body",
            align === "center" && "max-w-[680px]"
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 xl:px-[120px]",
        className
      )}
      {...props}
    />
  )
}
