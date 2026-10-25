"use client"

import { useState } from "react"
import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { services } from "@/lib/services"
import { cn } from "@/lib/utils"

const EMAIL = "info@cleaningpartners.ie"

const steps = [
  {
    title: "Send your request",
    description: "Fill in the form with a few details about your space.",
  },
  {
    title: "We get in touch",
    description: "Our team contacts you to talk through what you need.",
  },
  {
    title: "Your custom plan",
    description: "We customise a cleaning schedule and price to suit you.",
  },
]

const fieldClass =
  "w-full rounded-xl border border-[#d6e3ea] bg-[#f9fcfd] px-[18px] py-[15px] text-base/[normal] text-ink outline-none transition-colors placeholder:text-[#8a949e] focus:border-navy"

function Field({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="font-heading text-[15px]/[normal] font-semibold text-ink"
      >
        {label}
        {required && (
          <span aria-hidden className="ml-1 font-bold text-brand">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

export function QuoteForm() {
  const [sent, setSent] = useState(false)

  // No backend yet: hand the enquiry to the visitor's email app
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const value = (key: string) => String(data.get(key) ?? "").trim()
    const body = [
      `Name: ${value("name")}`,
      `Phone: ${value("phone")}`,
      `Email: ${value("email")}`,
      `Service: ${value("service") || "Not sure"}`,
      `Address / Eircode: ${value("address")}`,
      "",
      value("message"),
    ].join("\n")
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(
      `Quote request from ${value("name")}`
    )}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <section id="quote" className="scroll-mt-8 bg-surface py-16 md:py-28">
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_620px] lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
            >
              FREE QUOTE
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              Request a Quote
            </h2>
            <p data-reveal className="text-lg leading-[1.6] text-body">
              Tell us about your space and we&apos;ll put together a cleaning
              plan and price that suits you.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-[22px]/[normal] font-bold text-ink">
              What happens next
            </h3>
            <ol data-stagger className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex items-center gap-4 rounded-[18px] border border-line bg-white px-[22px] py-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand font-heading text-[17px]/[normal] font-extrabold text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-heading text-[19px]/[normal] font-bold text-ink">
                      {step.title}
                    </p>
                    <p className="text-[15px] leading-[1.5] text-body">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            data-reveal
            className="flex flex-col gap-1 rounded-[18px] bg-navy px-6 py-[22px]"
          >
            <p className="font-heading text-[19px]/[normal] font-bold text-white">
              Need us urgently?
            </p>
            <a
              href="tel:+353858062369"
              className="text-base/[normal] font-medium text-white/90 hover:text-white"
            >
              24hr contact: (085) 8062369
            </a>
          </div>
        </div>

        <form
          data-reveal
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-[28px] bg-white p-6 shadow-[0px_16px_48px_0px_rgba(41,99,143,0.08)] sm:p-10"
        >
          <h3 className="font-heading text-[28px]/[normal] font-bold text-ink">
            Send us your details
          </h3>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field label="Full Name" htmlFor="quote-name" required>
              <input
                id="quote-name"
                name="name"
                required
                autoComplete="name"
                placeholder="John Murphy"
                className={fieldClass}
              />
            </Field>
            <Field label="Phone Number" htmlFor="quote-phone" required>
              <input
                id="quote-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="085 000 0000"
                className={fieldClass}
              />
            </Field>
            <Field label="Email Address" htmlFor="quote-email" required>
              <input
                id="quote-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className={fieldClass}
              />
            </Field>
            <Field label="Service Required" htmlFor="quote-service">
              <div className="relative">
                <select
                  id="quote-service"
                  name="service"
                  defaultValue=""
                  className={cn(
                    fieldClass,
                    "appearance-none pr-11 has-[option[value='']:checked]:text-[#8a949e]"
                  )}
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.slug}>{service.title}</option>
                  ))}
                  <option>Domestic Cleaning</option>
                  <option>Other</option>
                </select>
                <Image
                  src="/images/contact/chevron.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="pointer-events-none absolute top-1/2 right-[18px] -translate-y-1/2"
                />
              </div>
            </Field>
          </div>

          <Field label="Address / Eircode" htmlFor="quote-address">
            <input
              id="quote-address"
              name="address"
              autoComplete="street-address"
              placeholder="e.g. Mountmellick, R32 YX49"
              className={fieldClass}
            />
          </Field>

          <Field label="Tell us about your space" htmlFor="quote-message">
            <textarea
              id="quote-message"
              name="message"
              placeholder="Type of building, size, how often you need cleaning…"
              className={cn(fieldClass, "h-[140px] resize-y")}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 text-[15px]/[normal] text-body">
            <input
              type="checkbox"
              name="consent"
              required
              className="size-[22px] shrink-0 cursor-pointer rounded-md border border-[#b9cbd6] accent-brand"
            />
            I agree to be contacted about my enquiry.
          </label>

          <button
            type="submit"
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "w-full",
            })}
          >
            Send Request
          </button>

          <p
            role="status"
            className={cn(
              "text-center text-[15px] text-body",
              !sent && "sr-only"
            )}
          >
            {sent &&
              `Your email app should open with your request. If it doesn't, email us at ${EMAIL}.`}
          </p>
        </form>
      </Container>
    </section>
  )
}
