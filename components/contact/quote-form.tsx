"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { PhoneIcon } from "lucide-react"

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

/** `error` is the template wording shown when the server rejects the field */
type FieldCopy = { label: string; placeholder: string; error: string }

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
    consent: { label: string; error: string }
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
  "w-full rounded-xl border border-line bg-[#f9fcfd] px-4 py-3.5 text-[15px]/[1.6] text-ink md:border-[#d6e3ea] md:px-[18px] md:py-[15px] md:text-base/[normal] outline-none transition-colors placeholder:text-[#9aa5b1] md:placeholder:text-[#8a949e] focus:border-navy"

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
        className="font-heading text-sm/[1.3] font-semibold text-ink md:text-[15px]/[normal]"
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
  const formRef = useRef<HTMLFormElement>(null)

  // After a rejected submit, move focus to the first invalid field.
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus()
  }, [fieldErrors])

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
    <section id="quote" className="scroll-mt-8 bg-surface py-12 md:py-28">
      <Container className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_620px] lg:gap-16">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
          <div className="order-1 flex flex-col gap-2 lg:order-none lg:gap-3">
            <p
              data-reveal
              className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[1.5px]"
            >
              {eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-5xl md:tracking-normal"
            >
              {title}
            </h2>
            <p
              data-reveal
              className="text-base leading-[1.6] text-body md:text-lg"
            >
              {intro}
            </p>
          </div>

          <div className="order-3 flex flex-col gap-4 lg:order-none">
            <h3 className="font-heading text-xl/[1.25] font-bold text-ink md:text-[22px]/[normal]">
              {stepsHeading}
            </h3>
            <ol data-stagger className="flex flex-col md:gap-4">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative flex items-center gap-4 max-md:block max-md:pt-1.5 max-md:pb-6 max-md:pl-[50px] max-md:last:pb-0 md:rounded-[18px] md:border md:border-line md:bg-white md:px-[22px] md:py-5"
                >
                  <span
                    data-timeline-badge
                    className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white md:static md:size-12 md:text-[17px]/[normal] md:font-extrabold"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      data-timeline-line
                      className="absolute top-[42px] bottom-0 left-[17px] w-0.5 bg-[#cfe3ec] md:hidden"
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="font-heading text-[17px]/[1.3] font-bold text-ink md:text-[19px]/[normal]">
                      {step.title}
                    </p>
                    <p className="text-sm leading-[1.55] text-body md:text-[15px] md:leading-[1.5]">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            data-reveal
            className="order-4 flex items-center gap-3.5 rounded-[20px] bg-[#1c3f5a] p-5 md:rounded-[18px] md:bg-navy md:px-6 md:py-[22px] lg:order-none"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-heading text-[17px]/[1.3] font-bold text-white md:text-[19px]/[normal]">
                {urgent.title}
              </p>
              <a
                href={urgent.phoneHref}
                className="text-sm/[1.55] text-white/85 hover:text-white md:text-base/[normal] md:font-medium md:text-white/90"
              >
                {urgent.phone}
              </a>
            </div>
            <a
              href={urgent.phoneHref}
              aria-label={urgent.phone}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white md:hidden"
            >
              <PhoneIcon aria-hidden className="size-5" />
            </a>
          </div>
        </div>

        <form
          data-reveal
          ref={formRef}
          onSubmit={handleSubmit}
          onFocus={() => void turnstile.prepare()}
          className="order-2 flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 sm:p-10 md:gap-5 md:rounded-[28px] md:border-0 md:p-6 md:shadow-[0px_16px_48px_0px_rgba(41,99,143,0.08)] lg:order-none"
        >
          <h3 className="font-heading text-xl/[1.25] font-bold text-ink md:text-[28px]/[normal]">
            {formTitle}
          </h3>

          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 md:gap-y-5">
            <Field
              label={fields.name.label}
              htmlFor="quote-name"
              error={fieldErrors.name ? fields.name.error : undefined}
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
              error={fieldErrors.phone ? fields.phone.error : undefined}
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
              error={fieldErrors.email ? fields.email.error : undefined}
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
              error={fieldErrors.service ? fields.service.error : undefined}
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
            error={fieldErrors.address ? fields.address.error : undefined}
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
            error={fieldErrors.message ? fields.message.error : undefined}
          >
            <textarea
              id="quote-message"
              {...invalid("message", "quote-message")}
              name="message"
              placeholder={fields.message.placeholder}
              className={cn(fieldClass, "h-[120px] resize-y md:h-[140px]")}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3.5 text-[15px]/[1.6] text-ink md:rounded-none md:border-0 md:p-0 md:text-[15px]/[normal] md:text-body">
            <input
              type="checkbox"
              name="consent"
              required
              {...invalid("consent", "quote-consent")}
              className="size-5 shrink-0 cursor-pointer rounded-md border border-[#b9cbd6] accent-brand md:size-[22px]"
            />
            {fields.consent.label}
          </label>
          {fieldErrors.consent && (
            <p
              id="quote-consent-error"
              className="-mt-2 text-sm/[normal] font-medium text-red-700"
            >
              {fields.consent.error}
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
