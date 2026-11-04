"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { issuesToFieldErrors } from "@/components/admin/editor/versioned-editor"
import { PageHeader, PRIMARY_ACTION } from "@/components/admin/page-header"
import { emptyValue } from "@/components/admin/schema-form/empty-value"
import { SchemaForm } from "@/components/admin/schema-form/schema-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, ApiError, errorMessage, unwrap } from "@/lib/api-client"
import { SLUG_PATTERN } from "@/lib/schemas/common"
import { jobContent } from "@/lib/schemas/content/job"

import { slugify } from "@/components/admin/services/new-service-form"

import { jobEditorMeta } from "./job-meta"

/** New job: full form, saved as an unpublished draft, then the editor opens. */
export function NewJobForm() {
  const router = useRouter()
  const [draft, setDraft] = useState<unknown>(() => emptyValue(jobContent))
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()
  const title = (draft as { title?: string }).title ?? ""
  const effectiveSlug = slugTouched ? slug : slugify(title)
  const create = useMutation({
    mutationFn: () => {
      const parsed = jobContent.safeParse(draft)
      if (!parsed.success) {
        setErrors(issuesToFieldErrors(parsed.error))
        throw new Error("Fill in the marked fields first.")
      }
      return unwrap(
        api["job-postings"].$post({
          json: { slug: effectiveSlug, draft: parsed.data },
        })
      )
    },
    onSuccess: (dto) => {
      toast.success("Job created", {
        description: "It is a draft until you publish it.",
      })
      router.push(`/admin/careers/${dto.id}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
      toast.error("Not created", {
        description: err instanceof ApiError ? errorMessage(err) : err.message,
      })
    },
  })
  const slugValid = SLUG_PATTERN.test(effectiveSlug)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New job"
        description="Fill in the job. It stays a draft until you publish it from the editor."
        actions={
          <Button
            type="button"
            className={PRIMARY_ACTION}
            disabled={create.isPending || !slugValid}
            aria-describedby={slugValid ? undefined : "new-job-slug-help"}
            onClick={() => create.mutate()}
          >
            Create draft
          </Button>
        }
      />
      <section
        aria-labelledby="new-slug"
        className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:p-6"
      >
        <h2 id="new-slug" className="text-base font-bold">
          Page address
        </h2>
        <label htmlFor="new-job-slug" className="text-sm text-muted-foreground">
          /careers/…
        </label>
        <Input
          id="new-job-slug"
          className="max-w-md"
          value={effectiveSlug}
          aria-invalid={(!!effectiveSlug && !slugValid) || !!errors?.slug}
          aria-describedby="new-job-slug-help"
          onChange={(event) => {
            setSlugTouched(true)
            setSlug(event.target.value)
          }}
        />
        {errors?.slug ? (
          <p
            id="new-job-slug-help"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.slug[0]}
          </p>
        ) : (
          <p
            id="new-job-slug-help"
            className={
              effectiveSlug && !slugValid
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {!effectiveSlug
              ? "Enter the job title below; the address is made from it. You can create the draft once it has an address."
              : slugValid
                ? `The page will be at /careers/${effectiveSlug}.`
                : "Use lowercase letters, numbers and single hyphens to create the draft."}
          </p>
        )}
      </section>
      <SchemaForm
        schema={jobContent}
        meta={jobEditorMeta}
        value={draft as never}
        onChange={setDraft}
        errors={errors}
      />
    </div>
  )
}
