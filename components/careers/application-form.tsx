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
import { animate } from "motion"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"

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

/** Keys whose errors show beside a field; any other 422 key gets the generic message. */
const SHOWN_FIELDS = new Set<string>([
  ...REQUIRED_TEXT,
  ...REQUIRED_YES_NO,
  "address",
  "eircode",
  "permissionExpiry",
  "shifts",
  "healthcareExperience",
  "recentRole",
  "certificates",
  "cv",
  "note",
  "heardAbout",
  "declaration",
  "privacy",
  "keepOnFile",
])
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
  current = true,
  children,
}: {
  step: Form["sections"][keyof Form["sections"]]
  /** On phones only the current step shows (the form is a wizard there) */
  current?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-5 max-md:rounded-[20px] max-md:border max-md:border-line max-md:bg-white max-md:p-5 md:border-t md:border-line md:pt-9 md:first:border-t-0 md:first:pt-0",
        !current && "max-md:hidden"
      )}
    >
      <div className="flex items-center gap-3.5 max-md:hidden">
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
      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2 md:gap-y-5">
        {children}
      </div>
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
  const [step, setStep] = useState(0)
  /** The phone wizard: the fields each step owns, in step order. */
  const STEP_KEYS: string[][] = [
    ["firstName", "surname", "email", "phone", "address", "town", "eircode"],
    ["rightToWork", "permissionExpiry", "gardaVetting", "livedAbroad"],
    ["startDate", "hoursPerWeek", "shifts", "transport"],
    ["experience", "healthcareExperience", "recentRole", "certificates"],
    ["cv", "note", "heardAbout"],
    ["declaration", "privacy", "keepOnFile"],
  ]
  const SECTION_KEYS: (keyof Form["sections"])[] = [
    "personal",
    "eligibility",
    "availability",
    "experience",
    "cv",
    "consent",
  ]
  const LAST_STEP = SECTION_KEYS.length - 1
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

  // Phone wizard: the new step slides in from the side it was reached from.
  const lastStep = useRef(0)
  useEffect(() => {
    const from = lastStep.current
    lastStep.current = step
    if (from === step) return
    if (!window.matchMedia("(max-width: 767px)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const section = formRef.current?.querySelectorAll("section")[step]
    if (!section) return
    animate(
      section,
      {
        opacity: [0, 1],
        transform: [
          `translateX(${step > from ? 28 : -28}px)`,
          "translateX(0px)",
        ],
      },
      { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    )
  }, [step])

  /** Phone wizard: check this step's fields, then move on. */
  const next = () => {
    const form = formRef.current
    if (!form) return
    const found = validate(new FormData(form))
    const own: FieldErrors = {}
    for (const key of STEP_KEYS[step]) if (found[key]) own[key] = found[key]
    setErrors(own)
    const first = Object.keys(own)[0]
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setStep(step + 1)
    window.scrollTo({ top: 0 })
  }
  const back = () => {
    setStep(step - 1)
    window.scrollTo({ top: 0 })
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
        // Turnstile, the job id or another key with no field here: say so.
        const keys = Object.keys(fieldErrors)
        if (keys.length === 0 || keys.some((k) => !SHOWN_FIELDS.has(k)))
          setMessage(form.errors.generic)
        else
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${keys[0]}"]`)
            ?.focus()
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
        className="flex flex-col items-center gap-5 text-center md:gap-4 md:self-start md:rounded-3xl md:border md:border-line md:bg-white md:px-6 md:py-14"
      >
        <span className="flex size-[72px] items-center justify-center rounded-full bg-brand text-white md:size-12 md:bg-transparent md:text-brand">
          <CheckCircle2 aria-hidden className="size-9 md:size-12" />
        </span>
        <h2 className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-2xl md:tracking-normal">
          {form.success.title}
        </h2>
        <p className="max-w-[520px] text-base leading-[1.6] text-body">
          {form.success.body}
        </p>
        <div className="flex w-full flex-col gap-4 rounded-[20px] border border-line bg-white p-5 text-left md:hidden">
          <p className="font-heading text-[17px]/[1.3] font-bold text-ink">
            {view.sidebar.nextTitle}
          </p>
          <ol className="flex flex-col">
            {view.sidebar.nextSteps.map((item, i, all) => (
              <li
                key={item.title}
                className="relative pt-1.5 pb-6 pl-[50px] last:pb-0"
              >
                <span className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full bg-brand font-heading text-sm/[1.3] font-semibold text-white">
                  {item.number}
                </span>
                {i < all.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-[42px] bottom-0 left-[17px] w-0.5 bg-[#cfe3ec]"
                  />
                )}
                <p className="font-heading text-[17px]/[1.3] font-bold text-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-[1.55] text-body">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
        {form.back ? (
          <Link
            href={form.back.href}
            className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-4 font-heading text-base/[1.2] font-bold text-white md:hidden"
          >
            {form.back.label}
          </Link>
        ) : null}
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
        aria-required={required || undefined}
        {...invalid(key)}
      />
      {help(key)}
      <ErrorText id={errorId(key)} message={errors[key]} />
    </div>
  )

  const select = (
    key: FieldKey,
    choices: string[],
    required = false,
    wide = false
  ) => (
    <div className={cn("flex flex-col gap-2", wide && "md:col-span-2")}>
      {label(key, required)}
      <div className="relative">
        <select
          id={idFor(key)}
          name={key}
          defaultValue=""
          className={cn(CONTROL_CLASS, "h-[52px] appearance-none pr-11")}
          aria-required={required || undefined}
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
          aria-required="true"
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
        aria-required={required || undefined}
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
            aria-required={key !== "keepOnFile" || undefined}
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
      className="relative flex flex-col gap-4 md:gap-9 md:self-start md:rounded-3xl md:border md:border-line md:bg-white md:p-12 md:shadow-[0px_6px_24px_0px_rgba(13,28,51,0.04)]"
    >
      <div className="-mx-5 flex flex-col gap-3 border-b border-line bg-white px-5 py-[18px] sm:-mx-8 sm:px-8 md:hidden">
        <p className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand">
          {form.sections[SECTION_KEYS[step]!].number}
        </p>
        <p className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink">
          {form.sections[SECTION_KEYS[step]!].title}
        </p>
        {form.sections[SECTION_KEYS[step]!].description ? (
          <p className="text-[13px] leading-[1.5] text-subtle">
            {form.sections[SECTION_KEYS[step]!].description}
          </p>
        ) : null}
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: SECTION_KEYS.length }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] flex-1 rounded-[3px]",
                "transition-colors duration-500 motion-reduce:transition-none",
                i <= step ? "bg-brand" : "bg-line"
              )}
            />
          ))}
        </div>
        {view.job ? (
          <p className="flex items-center gap-2 rounded-xl bg-[#e6f7fb] px-3 py-2.5 text-[13px]/[1.5] font-medium text-body">
            {view.sidebar.applyingFor}
            <span className="min-w-0 flex-1 font-heading text-sm/[1.3] font-semibold text-[#1c3f5a]">
              {view.job.title}
            </span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 max-md:hidden">
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
      <div className="flex flex-col gap-4 md:gap-9">
        <Section step={form.sections.personal} current={step === 0}>
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

        <Section step={form.sections.eligibility} current={step === 1}>
          {radios(
            "rightToWork",
            options.rightToWork.map((o) => ({ value: o, label: o }))
          )}
          {text("permissionExpiry", { type: "date" })}
          <div className="hidden md:block" />
          {radios("gardaVetting", yesNo)}
          {radios("livedAbroad", yesNo)}
        </Section>

        <Section step={form.sections.availability} current={step === 2}>
          {text("startDate", { type: "date", required: true })}
          {select("hoursPerWeek", options.hours, true)}
          {checkboxes("shifts", options.shifts, true)}
          {radios("transport", yesNo)}
        </Section>

        <Section step={form.sections.experience} current={step === 3}>
          {select("experience", options.years, true)}
          {select("healthcareExperience", options.healthcare)}
          {text("recentRole", { wide: true })}
          {checkboxes("certificates", options.certificates)}
        </Section>

        <Section step={form.sections.cv} current={step === 4}>
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
          {select("heardAbout", options.heardAbout, false, true)}
        </Section>

        <Section step={form.sections.consent} current={step === 5}>
          {consent("declaration")}
          {consent("privacy")}
          {consent("keepOnFile")}
          <InfoNote>{form.equalOpportunities}</InfoNote>
        </Section>
      </div>

      <div className="-mx-5 flex gap-2.5 border-t border-line bg-white px-4 py-3 sm:-mx-8 md:hidden">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="shrink-0 rounded-full border-[1.5px] border-navy px-6 py-4 font-heading text-base/[1.2] font-bold text-navy"
          >
            {form.back?.label ?? ""}
          </button>
        ) : form.back ? (
          <Link
            href={form.back.href}
            className="shrink-0 rounded-full border-[1.5px] border-navy px-6 py-4 font-heading text-base/[1.2] font-bold text-navy"
          >
            {form.back.label}
          </Link>
        ) : null}
        {step < LAST_STEP ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex min-w-0 flex-1 items-center justify-center rounded-full bg-brand px-6 py-4 font-heading text-base/[1.2] font-bold text-white"
          >
            {form.next}
          </button>
        ) : (
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 font-heading text-base/[1.2] font-bold text-white disabled:opacity-70"
          >
            {state === "sending" ? (
              <>
                <Loader2 aria-hidden className="size-[18px] animate-spin" />
                {form.sending}
              </>
            ) : (
              form.submit
            )}
          </button>
        )}
      </div>
      <div className="flex flex-col items-center gap-3 md:border-t md:border-line md:pt-9">
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-brand px-[30px] font-heading text-[17px] leading-[1.2] font-bold text-white transition-colors outline-none hover:bg-brand-deep focus-visible:ring-3 focus-visible:ring-brand/30 disabled:opacity-70 max-md:hidden"
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
        <p
          className={cn(
            "flex items-center gap-2 text-center text-[13px] leading-[1.3] text-body",
            step < LAST_STEP && "max-md:hidden"
          )}
        >
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
