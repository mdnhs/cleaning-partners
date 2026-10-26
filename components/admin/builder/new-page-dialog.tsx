"use client"

import { useId } from "react"

import { ADMIN_CONTROL } from "@/components/admin/form/form-ui"
import {
  describedBy,
  FieldShell,
} from "@/components/admin/schema-form/widgets/field-shell"
import { slugify } from "@/components/admin/services/new-service-form"
import { Input } from "@/components/ui/input"
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
