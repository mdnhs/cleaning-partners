"use client"

import Link from "next/link"
import { useMemo } from "react"

import { CollectionScreen } from "@/components/admin/collections/collection-screen"
import { VersionedEditor } from "@/components/admin/editor/versioned-editor"
import { FormCard } from "@/components/admin/form/form-ui"
import {
  createHeaderFooterBundle,
  headerFooterMeta,
  headerFooterSchema,
} from "@/components/admin/website/header-footer-bundle"
import { usePermission } from "@/hooks/use-permission"
import { SETTINGS_ENTRIES } from "@/lib/admin/settings-keys"
import { previewHref } from "@/lib/schemas/api/preview"

/**
 * Header & footer: one editor (one preview, one Publish) with a Header and a
 * Footer tab inside the form, below the title. The Footer tab ends with the
 * group companies list and a link to the forms & microcopy strings.
 */
export function HeaderFooterEditor({
  canMicrocopy,
}: {
  canMicrocopy: boolean
}) {
  const canEdit = usePermission(SETTINGS_ENTRIES.navigation.update)
  const bundle = useMemo(() => createHeaderFooterBundle(), [])
  const slots = useMemo(
    () => ({
      "after:footer": (
        <>
          <FormCard id="part-group-companies">
            <CollectionScreen name="group-companies" compact />
          </FormCard>
          {canMicrocopy ? (
            <FormCard
              id="part-microcopy"
              title="Forms & microcopy"
              description="The labels, messages and small texts used across the site."
            >
              <Link
                href="/admin/website/header-footer/microcopy"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Open forms &amp; microcopy
              </Link>
            </FormCard>
          ) : null}
        </>
      ),
    }),
    [canMicrocopy]
  )
  return (
    <VersionedEditor
      title="Header & footer"
      description="Changes stay in a draft until you publish."
      queryKey={["settings", "header-footer"]}
      load={bundle.load}
      saveDraft={bundle.saveDraft}
      publish={bundle.publish}
      restore={bundle.restore}
      schema={headerFooterSchema}
      meta={headerFooterMeta}
      revisions={{ entity: "settings", id: "navigation" }}
      previewHref={previewHref("settings", "navigation")}
      publicHref="/"
      canEdit={canEdit}
      canPublish={canEdit}
      slots={slots}
    />
  )
}
