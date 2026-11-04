"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { useId, useRef, useState, type ReactNode } from "react"

import { useTurnstile } from "@/components/contact/use-turnstile"
import {
  APPLICATIONS_CONFIG_ENDPOINT,
  APPLICATIONS_ENDPOINT,
} from "@/lib/schemas/api/applications"
import { cn } from "@/lib/utils"

import { CvDropzone } from "./cv-dropzone"
import type { ApplyView } from "./types"

type FieldErrors = Record<string, string>
type Form = ApplyView["form"]
type FieldKey = keyof Form["fields"]

const CONTROL_CLASS =
  "w-full rounded-xl border border-[#d6e3ea] bg-[#f9fcfd] px-[18px] text-base/[1.3] text-ink outline-none transition-colors placeholder:text-[#8a949e] focus:border-brand focus-visible:ring-3 focus-visible:ring-brand/25 aria-[invalid=true]:border-destructive"
/** One radio or checkbox choice drawn as a card (Figma 498:589, 498:666). */
const OPTION_CLASS =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-[#d6e3ea] bg-white px-4 py-3.5 text-[15px] leading-[1.35] text-ink transition-colors has-checked:border-[1.5px] has-checked:border-brand has-checked:bg-[#e6f7fb] has-focus-visible:ring-3 has-focus-visible:ring-brand/25"
const RADIO_CLASS =
  "size-5 shrink-0 appearance-none rounded-full border-[1.5px] border-[#c3ccd9] bg-white outline-none checked:border-[6px] checked:border-brand"
const CHECKBOX_CLASS =
  "size-5 shrink-0 appearance-none rounded-[6px] border-[1.5px] border-[#c3ccd9] bg-white outline-none checked:border-brand checked:bg-brand"

/** Fields the visitor must fill before anything is sent. */
const REQUIRED_TEXT: FieldKey[] = [
  "firstName",
  "surname",
  "email",
  "phone",
  "town",
  "rightToWork",
  "startDate",
  "hoursPerWeek",
  "experience",
]
const REQUIRED_YES_NO: FieldKey[] = ["gardaVetting", "livedAbroad", "transport"]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The 422 body's per-field messages (server/lib/errors). */
async function readFieldErrors(res: Response): Promise<FieldErrors> {
  try {
    const body = (await res.json()) as {
      error?: { fieldErrors?: Record<string, unknown> }
    }
    const out: FieldErrors = {}
    for (const [key, value] of Object.entries(body.error?.fieldErrors ?? {}))
      if (Array.isArray(value) && typeof value[0] === "string")
        out[key] = value[0]
    return out
  } catch {
    return {}
  }
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}

function Section({
  step,
  children,
}: {
  step: Form["sections"][keyof Form["sections"]]
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 border-t border-line pt-9 first:border-t-0 first:pt-0"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand font-heading text-[15px] leading-[1.2] font-extrabold text-white">
          {step.number}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3
            id={id}
            className="font-heading text-xl leading-[1.2] font-bold text-ink md:text-[23px]"
          >
            {step.title}
          </h3>
          {step.description ? (
            <p className="text-sm leading-[1.4] text-body">
              {step.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#e6f7fb] px-4 py-3.5 md:col-span-2">
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-deep" />
      <p className="text-sm leading-[1.5] text-ink">{children}</p>
    </div>
  )
}

/**
 * The application: six sections, one submit. Posts multipart (the CV is a
 * file) with the quote form's protections; a 409 means the job closed.
 */
export function ApplicationForm({ view }: { view: ApplyView }) {
  const form = view.form
  const { fields, options } = form
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const turnstileSlot = useRef<HTMLDivElement>(null)
  const turnstile = useTurnstile(turnstileSlot, APPLICATIONS_CONFIG_ENDPOINT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [state, setState] = useState<"idle" | "sending" | "done" | "closed">(
    "idle"
  )
  const [message, setMessage] = useState<string | null>(null)
  const [cv, setCv] = useState<File | null>(null)

  const idFor = (key: string) => `${uid}-${key}`
  const errorId = (key: string) => `${uid}-${key}-error`
  const invalid = (key: string) =>
    errors[key]
      ? { "aria-invalid": true as const, "aria-describedby": errorId(key) }
      : {}

  const validate = (data: FormData): FieldErrors => {
    const out: FieldErrors = {}
    const value = (key: string) => String(data.get(key) ?? "").trim()
    for (const key of [...REQUIRED_TEXT, ...REQUIRED_YES_NO])
      if (!value(key)) out[key] = form.errors.required
    if (value("email") && !EMAIL_PATTERN.test(value("email")))
      out.email = form.errors.invalidEmail
    if (data.getAll("shifts").length === 0) out.shifts = form.errors.required
    if (!data.get("declaration")) out.declaration = form.errors.required
    if (!data.get("privacy")) out.privacy = form.errors.required
    return out
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (state === "sending") return
    const data = new FormData(event.currentTarget)
    const found = validate(data)
    setErrors(found)
    setMessage(null)
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0]!
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    data.delete("cv")
    if (cv) data.set("cv", cv)
    if (view.job) data.set("jobId", view.job.id)
    data.set("sourcePage", window.location.pathname)
    setState("sending")
    try {
      const token = await turnstile.getToken()
      if (token) data.set("turnstileToken", token)
      const res = await fetch(APPLICATIONS_ENDPOINT, {
        method: "POST",
        body: data,
      })
      if (res.ok) return setState("done")
      if (res.status === 409) return setState("closed")
      setState("idle")
      turnstile.reset()
      if (res.status === 422) {
        const fieldErrors = await readFieldErrors(res)
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length === 0)
          setMessage(form.errors.generic)
        return
      }
      setMessage(
        res.status === 429 ? form.errors.rateLimited : form.errors.generic
      )
    } catch {
      setState("idle")
      setMessage(form.errors.generic)
    }
  }

  if (state === "done")
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 self-start rounded-3xl border border-line bg-white px-6 py-14 text-center"
      >
        <CheckCircle2 aria-hidden className="size-12 text-brand" />
        <h2 className="font-heading text-2xl font-bold text-ink">
          {form.success.title}
        </h2>
        <p className="max-w-[520px] text-base leading-[1.6] text-body">
          {form.success.body}
        </p>
      </div>
    )

  if (state === "closed")
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 self-start rounded-3xl border border-line bg-white px-6 py-14 text-center"
      >
        <p className="max-w-[520px] text-base leading-[1.6] text-ink">
          {form.errors.closed}
        </p>
        {view.closed?.back ? (
          <Link
            href={view.closed.back.href}
            className="font-heading font-semibold text-brand underline underline-offset-4"
          >
            {view.closed.back.label}
          </Link>
        ) : null}
      </div>
    )

  const label = (key: FieldKey, required: boolean) => (
    <label
      htmlFor={idFor(key)}
      className="font-heading text-[15px] leading-[1.35] font-semibold text-ink"
    >
      {fields[key].label}
      {required ? (
        <span aria-hidden className="text-[#e5484d]">
          {" "}
          {form.required}
        </span>
      ) : null}
    </label>
  )
  const help = (key: FieldKey) =>
    fields[key].help ? (
      <p className="text-[13px] leading-[1.4] text-body">{fields[key].help}</p>
    ) : null

  const text = (
    key: FieldKey,
    {
      type = "text",
      required = false,
      autoComplete,
      wide = false,
    }: {
      type?: string
      required?: boolean
      autoComplete?: string
      wide?: boolean
    } = {}
  ) => (
    <div className={cn("flex flex-col gap-2", wide && "md:col-span-2")}>
      {label(key, required)}
      <input
        id={idFor(key)}
        name={key}
        type={type}
        autoComplete={autoComplete}
        placeholder={fields[key].placeholder || undefined}
        className={cn(CONTROL_CLASS, "h-[52px]")}
        {...invalid(key)}
      />
      {help(key)}
      <ErrorText id={errorId(key)} message={errors[key]} />
    </div>
  )

  const select = (key: FieldKey, choices: string[], required = false) => (
    <div className="flex flex-col gap-2">
      {label(key, required)}
      <div className="relative">
        <select
          id={idFor(key)}
          name={key}
          defaultValue=""
          className={cn(CONTROL_CLASS, "h-[52px] appearance-none pr-11")}
          {...invalid(key)}
        >
          <option value="">
            {fields[key].placeholder || form.selectPlaceholder}
          </option>
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-[18px] size-[18px] -translate-y-1/2 text-subtle"
        />
      </div>
      {help(key)}
      <ErrorText id={errorId(key)} message={errors[key]} />
    </div>
  )

  const radios = (
    key: FieldKey,
    choices: { value: string; label: string }[],
    wide = true
  ) => {
    const labelId = `${idFor(key)}-label`
    return (
      <div className={cn("flex flex-col gap-2.5", wide && "md:col-span-2")}>
        <p
          id={labelId}
          className="font-heading text-[15px] leading-[1.35] font-semibold text-ink"
        >
          {fields[key].label}
          <span aria-hidden className="text-[#e5484d]">
            {" "}
            {form.required}
          </span>
        </p>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={errors[key] ? errorId(key) : undefined}
          className="grid gap-3 sm:grid-cols-2"
        >
          {choices.map((choice) => (
            <label key={choice.value} className={OPTION_CLASS}>
              <input
                type="radio"
                name={key}
                value={choice.value}
                className={RADIO_CLASS}
              />
              {choice.label}
            </label>
          ))}
        </div>
        {help(key)}
        <ErrorText id={errorId(key)} message={errors[key]} />
      </div>
    )
  }
  const yesNo = [
    { value: "yes", label: form.yes },
    { value: "no", label: form.no },
  ]

  const checkboxes = (key: FieldKey, choices: string[], required = false) => {
    const labelId = `${idFor(key)}-label`
    return (
      <fieldset
        aria-labelledby={labelId}
        aria-describedby={errors[key] ? errorId(key) : undefined}
        className="flex flex-col gap-2.5 md:col-span-2"
      >
        <p
          id={labelId}
          className="font-heading text-[15px] leading-[1.35] font-semibold text-ink"
        >
          {fields[key].label}
          {required ? (
            <span aria-hidden className="text-[#e5484d]">
              {" "}
              {form.required}
            </span>
          ) : null}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {choices.map((choice) => (
            <label key={choice} className={OPTION_CLASS}>
              <span className="relative flex shrink-0">
                <input
                  type="checkbox"
                  name={key}
                  value={choice}
                  className={cn("peer", CHECKBOX_CLASS)}
                />
                <Check
                  aria-hidden
                  strokeWidth={3}
                  className="pointer-events-none absolute inset-[3px] hidden size-3.5 text-white peer-checked:block"
                />
              </span>
              {choice}
            </label>
          ))}
        </div>
        {key === "certificates" && fields[key].help ? (
          <InfoNote>{fields[key].help}</InfoNote>
        ) : (
          help(key)
        )}
        <ErrorText id={errorId(key)} message={errors[key]} />
      </fieldset>
    )
  }

  const consent = (key: "declaration" | "privacy" | "keepOnFile") => (
    <div className="flex flex-col gap-1.5 md:col-span-2">
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.5] text-body">
        <span className="relative mt-0.5 flex shrink-0">
          <input
            type="checkbox"
            name={key}
            className={cn(
              "peer",
              CHECKBOX_CLASS,
              "focus-visible:ring-3 focus-visible:ring-brand/25"
            )}
            {...invalid(key)}
          />
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-[3px] hidden size-3.5 text-white peer-checked:block"
          />
        </span>
        <span>
          {form[key]}
          {key !== "keepOnFile" ? (
            <span aria-hidden className="text-[#e5484d]">
              {" "}
              {form.required}
            </span>
          ) : null}
        </span>
      </label>
      <ErrorText id={errorId(key)} message={errors[key]} />
    </div>
  )

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      onFocus={() => void turnstile.prepare()}
      className="relative flex flex-col gap-9 self-start rounded-3xl border border-line bg-white p-6 shadow-[0px_6px_24px_0px_rgba(13,28,51,0.04)] md:p-12"
    >
      <div className="flex flex-col gap-2.5">
        {form.back ? (
          <Link
            href={form.back.href}
            className="inline-flex w-fit items-center gap-2 font-heading text-[15px] leading-[1.2] font-bold text-[#0b88a3] hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {form.back.label}
          </Link>
        ) : null}
        <h2 className="font-heading text-[30px] leading-[1.2] font-bold text-ink md:text-[36px]">
          {form.title}
        </h2>
        <p className="text-base leading-[1.55] text-body">{form.intro}</p>
      </div>
      <div className="flex flex-col gap-9">
        <Section step={form.sections.personal}>
          {text("firstName", { required: true, autoComplete: "given-name" })}
          {text("surname", { required: true, autoComplete: "family-name" })}
          {text("email", {
            type: "email",
            required: true,
            autoComplete: "email",
          })}
          {text("phone", { type: "tel", required: true, autoComplete: "tel" })}
          {text("address", { autoComplete: "street-address", wide: true })}
          {text("town", { required: true, autoComplete: "address-level2" })}
          {text("eircode", { autoComplete: "postal-code" })}
        </Section>

        <Section step={form.sections.eligibility}>
          {radios(
            "rightToWork",
            options.rightToWork.map((o) => ({ value: o, label: o }))
          )}
          {text("permissionExpiry", { type: "date" })}
          <div className="hidden md:block" />
          {radios("gardaVetting", yesNo)}
          {radios("livedAbroad", yesNo)}
        </Section>

        <Section step={form.sections.availability}>
          {text("startDate", { type: "date", required: true })}
          {select("hoursPerWeek", options.hours, true)}
          {checkboxes("shifts", options.shifts, true)}
          {radios("transport", yesNo)}
        </Section>

        <Section step={form.sections.experience}>
          {select("experience", options.years, true)}
          {select("healthcareExperience", options.healthcare)}
          {text("recentRole", { wide: true })}
          {checkboxes("certificates", options.certificates)}
        </Section>

        <Section step={form.sections.cv}>
          <div className="md:col-span-2">
            <CvDropzone
              name="cv"
              label={fields.cv.label}
              drop={form.cvDrop}
              browse={form.cvBrowse}
              help={form.cvHelp}
              typeError={form.errors.cvType}
              sizeError={form.errors.cvSize}
              error={errors.cv}
              onChange={setCv}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            {label("note", false)}
            <textarea
              id={idFor("note")}
              name="note"
              rows={5}
              maxLength={4000}
              placeholder={fields.note.placeholder || undefined}
              className={cn(CONTROL_CLASS, "resize-y")}
              {...invalid("note")}
            />
            {help("note")}
            <ErrorText id={errorId("note")} message={errors.note} />
          </div>
          {select("heardAbout", options.heardAbout)}
        </Section>

        <Section step={form.sections.consent}>
          {consent("declaration")}
          {consent("privacy")}
          {consent("keepOnFile")}
          <InfoNote>{form.equalOpportunities}</InfoNote>
        </Section>
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-line pt-9">
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-brand px-[30px] font-heading text-[17px] leading-[1.2] font-bold text-white transition-colors outline-none hover:bg-brand-deep focus-visible:ring-3 focus-visible:ring-brand/30 disabled:opacity-70"
        >
          {state === "sending" ? (
            <>
              <Loader2 aria-hidden className="size-[18px] animate-spin" />
              {form.sending}
            </>
          ) : (
            <>
              {form.submit}
              <ArrowRight aria-hidden className="size-[18px]" />
            </>
          )}
        </button>
        <p className="flex items-center gap-2 text-center text-[13px] leading-[1.3] text-body">
          <Lock aria-hidden className="size-3.5 shrink-0" />
          {form.privacyNote}
        </p>
        <p
          role="alert"
          className={cn(
            "text-center text-[15px] font-medium text-destructive",
            !message && "sr-only"
          )}
        >
          {message ?? ""}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-[10000px] h-px w-px overflow-hidden opacity-0"
      >
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div ref={turnstileSlot} className="absolute h-0 w-0 overflow-hidden" />
    </form>
  )
}
