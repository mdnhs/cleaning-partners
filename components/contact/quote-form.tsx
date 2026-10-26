"use client"

import { useRef, useState } from "react"
import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { track } from "@/lib/analytics/events"
import { interpolate } from "@/lib/interpolate"
import {
  analyticsConsent,
  readAttribution,
  sessionStore,
} from "@/lib/leads/attribution"
import { LEADS_ENDPOINT } from "@/lib/schemas/api/leads"
import { cn } from "@/lib/utils"

import { useTurnstile } from "./use-turnstile"

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
    }
    address: FieldCopy
    message: FieldCopy
    consent: { label: string }
  }
  chevron: string
  submitLabel: string
  /** The contact email, shown in the success message */
  email: string
  /** {email} is the contact email */
  sentMessage: string
  sendingLabel: string
  errorMessage: string
  rateLimitedMessage: string
}

type Feedback = { kind: "success" | "error"; message: string }
type FieldErrors = Record<string, string[]>

/** The 422 body's per-field messages (lib/schemas/api/leads, server/lib/errors). */
async function readFieldErrors(res: Response): Promise<FieldErrors> {
  try {
    const body = (await res.json()) as {
      error?: { fieldErrors?: Record<string, unknown> }
    }
    const out: FieldErrors = {}
    for (const [key, value] of Object.entries(body.error?.fieldErrors ?? {})) {
      if (Array.isArray(value) && typeof value[0] === "string")
        out[key] = value.filter((v): v is string => typeof v === "string")
    }
    return out
  } catch {
    return {}
  }
}

const fieldClass =
  "w-full rounded-xl border border-[#d6e3ea] bg-[#f9fcfd] px-[18px] py-[15px] text-base/[normal] text-ink outline-none transition-colors placeholder:text-[#8a949e] focus:border-navy"

function Field({
  label,
  htmlFor,
  required,
  className,
  error,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  className?: string
  /** Server message for this field; the line exists only after a rejected submit */
  error?: string
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
      {error && (
        <p
          id={`${htmlFor}-error`}
          className="text-sm/[normal] font-medium text-red-700"
        >
          {error}
        </p>
      )}
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
  sentMessage,
  sendingLabel,
  errorMessage,
  rateLimitedMessage,
}: QuoteFormProps) {
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  // State is read from a stale closure until React re-renders; the ref
  // blocks a second submit fired in the same tick.
  const inFlight = useRef(false)
  const turnstileSlot = useRef<HTMLDivElement>(null)
  const turnstile = useTurnstile(turnstileSlot)

  /** aria wiring that exists only while a field has a server error */
  const invalid = (name: string, id: string) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` }
      : {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    const form = e.currentTarget
    const data = new FormData(form)
    const field = (name: string) => String(data.get(name) ?? "")
    setSending(true)
    setFeedback(null)
    setFieldErrors({})
    try {
      const turnstileToken = await turnstile.getToken()
      // First touch, only with analytics consent
      const attribution =
        analyticsConsent() === true ? readAttribution(sessionStore()) : null
      const res = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: field("name"),
          phone: field("phone"),
          email: field("email"),
          service: field("service"),
          address: field("address"),
          message: field("message"),
          consent: true,
          sourcePage: window.location.pathname,
          website: field("website"),
          ...(turnstileToken ? { turnstileToken } : {}),
          ...(attribution ? { attribution } : {}),
        }),
      })
      if (res.ok) {
        form.reset()
        track({
          event: "lead_submitted",
          source_page: window.location.pathname,
        })
        setFeedback({
          kind: "success",
          message: interpolate(sentMessage, { email }),
        })
      } else {
        if (res.status === 422) setFieldErrors(await readFieldErrors(res))
        setFeedback({
          kind: "error",
          message: res.status === 429 ? rateLimitedMessage : errorMessage,
        })
      }
    } catch {
      setFeedback({ kind: "error", message: errorMessage })
    } finally {
      inFlight.current = false
      setSending(false)
      turnstile.reset()
    }
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
          onFocus={() => void turnstile.prepare()}
          className="flex flex-col gap-5 rounded-[28px] bg-white p-6 shadow-[0px_16px_48px_0px_rgba(41,99,143,0.08)] sm:p-10"
        >
          <h3 className="font-heading text-[28px]/[normal] font-bold text-ink">
            {formTitle}
          </h3>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field
              label={fields.name.label}
              htmlFor="quote-name"
              error={fieldErrors.name?.[0]}
              required
            >
              <input
                id="quote-name"
                {...invalid("name", "quote-name")}
                name="name"
                required
                autoComplete="name"
                placeholder={fields.name.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field
              label={fields.phone.label}
              htmlFor="quote-phone"
              error={fieldErrors.phone?.[0]}
              required
            >
              <input
                id="quote-phone"
                {...invalid("phone", "quote-phone")}
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder={fields.phone.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field
              label={fields.email.label}
              htmlFor="quote-email"
              error={fieldErrors.email?.[0]}
              required
            >
              <input
                id="quote-email"
                {...invalid("email", "quote-email")}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={fields.email.placeholder}
                className={fieldClass}
              />
            </Field>
            <Field
              label={fields.service.label}
              htmlFor="quote-service"
              error={fieldErrors.service?.[0]}
            >
              <div className="relative">
                <select
                  id="quote-service"
                  {...invalid("service", "quote-service")}
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

          <Field
            label={fields.address.label}
            htmlFor="quote-address"
            error={fieldErrors.address?.[0]}
          >
            <input
              id="quote-address"
              {...invalid("address", "quote-address")}
              name="address"
              autoComplete="street-address"
              placeholder={fields.address.placeholder}
              className={fieldClass}
            />
          </Field>

          <Field
            label={fields.message.label}
            htmlFor="quote-message"
            error={fieldErrors.message?.[0]}
          >
            <textarea
              id="quote-message"
              {...invalid("message", "quote-message")}
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
          {fieldErrors.consent?.[0] && (
            <p className="-mt-2 text-sm/[normal] font-medium text-red-700">
              {fieldErrors.consent[0]}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "w-full",
            })}
          >
            {sending ? sendingLabel : submitLabel}
          </button>

          <p
            role="status"
            className={cn(
              "text-center text-[15px] text-body",
              !feedback && "sr-only",
              feedback?.kind === "error" && "font-medium text-red-700"
            )}
          >
            {feedback?.message ?? ""}
          </p>

          {/* Out of the flex flow: no gap, no height, no layout change. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -left-[10000px] h-px w-px overflow-hidden opacity-0"
          >
            <input
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div
            ref={turnstileSlot}
            className="absolute h-0 w-0 overflow-hidden"
          />
        </form>
      </Container>
    </section>
  )
}
