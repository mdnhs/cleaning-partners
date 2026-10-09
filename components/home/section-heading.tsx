import { cn } from "@/lib/utils"

type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  align?: "left" | "center"
  tone?: "default" | "inverted"
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "default",
  className,
}: SectionHeadingProps) {
  const inverted = tone === "inverted"

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className
      )}
    >
      <p
        data-reveal
        className={cn(
          "font-heading text-[15px] font-bold tracking-[2.1px]",
          inverted ? "text-sky" : "text-brand"
        )}
      >
        {eyebrow}
      </p>
      <h2
        data-split
        className={cn(
          "font-heading text-4xl leading-[1.1] font-bold md:text-5xl",
          inverted ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          data-reveal
          className={cn(
            "text-lg leading-[1.6]",
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
        "relative mx-auto w-full max-w-[1440px] px-4 sm:px-8 xl:px-[120px]",
        className
      )}
      {...props}
    />
  )
}
