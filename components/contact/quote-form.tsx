"use client"

import { useState } from "react"
import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { interpolate } from "@/lib/interpolate"
import { cn } from "@/lib/utils"

type FieldCopy = { label: string; placeholder: string }

// A client component: every string arrives as a prop from the server view.
export type QuoteFormProps = {
  eyebrow: string
  title: string
  intro: string
  stepsHeading: string
  steps: { title: string; description: string }[]
  urgent: { title: string; phone: string; phoneHref: string }
  formTitle: string
  fields: {
    name: FieldCopy
    phone: FieldCopy
    email: FieldCopy
    service: FieldCopy & {
      /** Every service, then the extras */
      options: string[]
      /** Written in the enquiry when no service is picked */
      fallback: string
    }
    address: FieldCopy
    message: FieldCopy
    consent: { label: string }
  }
  chevron: string
  submitLabel: string
  /** Where the enquiry is sent (mailto: until the lead API, Task 7.3) */
  email: string
  /** {name} is the visitor's name */
  mailSubject: string
  /** {email} is the recipient address */
  sentMessage: string
}

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

export function QuoteForm({
  eyebrow,
  title,
  intro,
  stepsHeading,
  steps,
  urgent,
  formTitle,
  fields,
  chevron,
  submitLabel,
  email,
  mailSubject,
  sentMessage,
}: QuoteFormProps) {
  const [sent, setSent] = useState(false)

  // No backend yet: hand the enquiry to the visitor's email app
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const value = (key: string) => String(data.get(key) ?? "").trim()
    const body = [
      `${fields.name.label}: ${value("name")}`,
      `${fields.phone.label}: ${value("phone")}`,
      `${fields.email.label}: ${value("email")}`,
      `${fields.service.label}: ${value("service") || fields.service.fallback}`,
      `${fields.address.label}: ${value("address")}`,
      "",
      value("message"),
    ].join("\n")
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      interpolate(mailSubject, { name: value("name") })
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
              {eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              {title}
            </h2>
            <p data-reveal className="text-lg leading-[1.6] text-body">
              {intro}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-[22px]/[normal] font-bold text-ink">
              {stepsHeading}
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
              {urgent.title}
            </p>
            <a
              href={urgent.phoneHref}
              className="text-base/[normal] font-medium text-white/90 hover:text-white"
            >
              {urgent.phone}
            </a>
          </div>
        </div>

        <form
          data-reveal
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-[28px] bg-white p-6 shadow-[0px_16px_48px_0px_rgba(41,99,143,0.08)] sm:p-10"
        >
          <h3 className="font-heading text-[28px]/[normal] font-bold text-ink">
            {formTitle}
          </h3>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field label={fields.name.label} htmlFor="quote-name" required>
              <input
                id="quote-name"
                name="name"
                required
                autoComplete="name"
                placeholder={fields.name.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field label={fields.phone.label} htmlFor="quote-phone" required>
              <input
                id="quote-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder={fields.phone.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field label={fields.email.label} htmlFor="quote-email" required>
              <input
                id="quote-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={fields.email.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field label={fields.service.label} htmlFor="quote-service">
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
                  <option value="">{fields.service.placeholder}</option>
                  {fields.service.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <Image
                  src={chevron}
                  alt=""
                  width={16}
                  height={16}
                  className="pointer-events-none absolute top-1/2 right-[18px] -translate-y-1/2"
                />
              </div>
            </Field>
          </div>

          <Field label={fields.address.label} htmlFor="quote-address">
            <input
              id="quote-address"
              name="address"
              autoComplete="street-address"
              placeholder={fields.address.placeholder}
              className={fieldClass}
            />
          </Field>

          <Field label={fields.message.label} htmlFor="quote-message">
            <textarea
              id="quote-message"
              name="message"
              placeholder={fields.message.placeholder}
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
            {fields.consent.label}
          </label>

          <button
            type="submit"
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "w-full",
            })}
          >
            {submitLabel}
          </button>

          <p
            role="status"
            className={cn(
              "text-center text-[15px] text-body",
              !sent && "sr-only"
            )}
          >
            {sent && interpolate(sentMessage, { email })}
          </p>
        </form>
      </Container>
    </section>
  )
}
