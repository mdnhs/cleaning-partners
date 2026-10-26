"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { toast } from "sonner"

import { ADMIN_CONTROL } from "@/components/admin/form/form-ui"
import {
  describedBy,
  FieldShell,
} from "@/components/admin/schema-form/widgets/field-shell"
import { slugify } from "@/components/admin/services/new-service-form"
import { FORM_ACTION } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { DraftDocument } from "@/blocks/document"
import { api, ApiError, errorMessage, unwrap } from "@/lib/api-client"
import { BUILDER_SLUG_MAX } from "@/lib/builder-slug"
import { builderSlug } from "@/lib/schemas/api/builder-pages"
import { cn } from "@/lib/utils"

/** Query key of the custom pages list (Pages › Custom pages). */
export const BUILDER_PAGES_KEY = ["builder-pages"] as const

/** "Spring campaign" → "spring-campaign", at most 60 characters. */
export function builderSlugFrom(title: string): string {
  return slugify(title).slice(0, BUILDER_SLUG_MAX).replace(/-+$/, "")
}

/** Why `slug` cannot be an address, or null (lib/schemas/api/builder-pages). */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter an address"
  const result = builderSlug.safeParse(slug)
  return result.success ? null : result.error.issues[0].message
}

type Fields = { title: string; slug: string }
type Errors = Partial<Record<keyof Fields, string>>

/**
 * Title and address inputs (new page dialog, builder SEO tab): the address
 * reads /p/<slug>, validated as typed; server errors win.
 */
export function TitleSlugFields({
  value,
  onChange,
  errors,
  disabled,
  slugHelp,
}: {
  value: Fields
  onChange(next: Partial<Fields>): void
  errors: Errors
  disabled?: boolean
  slugHelp?: string
}) {
  const id = useId()
  const titleId = `${id}-title`
  const slugId = `${id}-slug`
  const help = slugHelp ?? `The page's address: /p/${value.slug || "…"}`
  return (
    <>
      <FieldShell id={titleId} label="Title" error={errors.title}>
        <Input
          id={titleId}
          className={cn(ADMIN_CONTROL, "pointer-coarse:h-11")}
          value={value.title}
          maxLength={80}
          autoComplete="off"
          disabled={disabled}
          aria-required
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy(titleId, { error: errors.title })}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </FieldShell>
      <FieldShell id={slugId} label="Address" help={help} error={errors.slug}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="font-mono text-sm text-muted-foreground">
            /p/
          </span>
          <Input
            id={slugId}
            className={cn(ADMIN_CONTROL, "font-mono pointer-coarse:h-11")}
            value={value.slug}
            maxLength={BUILDER_SLUG_MAX}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            aria-required
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={describedBy(slugId, {
              help,
              error: errors.slug,
            })}
            onChange={(event) => onChange({ slug: event.target.value })}
          />
        </div>
      </FieldShell>
    </>
  )
}

/** What "Copy to new page" starts from: the suggested names and the blocks. */
export type CopySeed = {
  title: string
  slug: string
  seed: DraftDocument
}

/**
 * New page (a blank page) or, with `copy`, "Copy to a new page" seeded with a
 * fixed page's blocks. Creating opens the builder.
 */
export function NewPageDialog({
  open,
  onOpenChange,
  copy,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  copy?: CopySeed
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remounts per opening, so every opening starts from the defaults. */}
        {open ? (
          <NewPageForm copy={copy} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewPageForm({
  copy,
  onCancel,
}: {
  copy?: CopySeed
  onCancel(): void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(copy?.title ?? "")
  const [slug, setSlug] = useState(copy?.slug ?? "")
  // The address follows the title until it is edited by hand.
  const [slugTouched, setSlugTouched] = useState(copy !== undefined)
  const [serverErrors, setServerErrors] = useState<{
    title?: string
    slug?: string
  }>({})
  const [submitted, setSubmitted] = useState(false)
  const address = slugTouched ? slug : builderSlugFrom(title)
  const local = {
    title: title.trim() ? undefined : "Enter a title",
    slug: slugProblem(address) ?? undefined,
  }
  const errors = {
    title: serverErrors.title ?? (submitted ? local.title : undefined),
    slug: serverErrors.slug ?? (address || submitted ? local.slug : undefined),
  }
  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api["builder-pages"].$post({
          json: {
            title: title.trim(),
            slug: address,
            ...(copy ? { seed: copy.seed } : {}),
          },
        })
      ),
    onSuccess: async (dto) => {
      await queryClient.invalidateQueries({ queryKey: BUILDER_PAGES_KEY })
      toast.success(copy ? "Copy created" : "Page created", {
        description: "It is a draft until you publish it.",
      })
      router.push(`/admin/pages/custom/${dto.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const next = {
          title: error.fieldErrors.title?.[0],
          slug: error.fieldErrors.slug?.[0],
        }
        setServerErrors(next)
        if (next.title || next.slug) return
      }
      toast.error("Not created", { description: errorMessage(error) })
    },
  })
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (local.title || local.slug) return
        create.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{copy ? "Copy to a new page" : "New page"}</DialogTitle>
        <DialogDescription>
          {copy
            ? "The new page starts with this page's sections and text. This page stays as it is."
            : "Give the page a title and an address. It stays a draft until you publish it."}
        </DialogDescription>
      </DialogHeader>
      <TitleSlugFields
        value={{ title, slug: address }}
        errors={errors}
        disabled={create.isPending}
        onChange={(next) => {
          setServerErrors({})
          if (next.title !== undefined) setTitle(next.title)
          if (next.slug !== undefined) {
            setSlugTouched(true)
            setSlug(next.slug)
          }
        }}
      />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className={FORM_ACTION}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={FORM_ACTION}
          disabled={create.isPending}
        >
          {create.isPending
            ? "Creating…"
            : copy
              ? "Create copy"
              : "Create page"}
        </Button>
      </DialogFooter>
    </form>
  )
}
