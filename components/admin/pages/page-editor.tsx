"use client"

import { Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  type CopySeed,
  NewPageDialog,
} from "@/components/admin/builder/new-page-dialog"
import { EDITOR_ACTION } from "@/components/admin/editor/editor-layout"
import { VersionedEditor } from "@/components/admin/editor/versioned-editor"
import { EditorSeoTab, textAt } from "@/components/admin/seo/editor-seo-tab"
import { SeoLink } from "@/components/admin/seo/seo-link"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/hooks/use-permission"
import { PAGE_LABELS } from "@/lib/admin/page-labels"
import { api, unwrap } from "@/lib/api-client"
import { previewHref } from "@/lib/schemas/api/preview"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import { templateEditorMeta } from "@/templates/editor-meta"
import {
  PAGE_PATHS,
  PAGES,
  type PageData,
  type PageKey,
  templates,
} from "@/templates/registry"

/**
 * Editor for one fixed page (master 4.4); SEO tab (master 8.1). "Copy to new
 * page" (R10-11) starts a builder page from the page's current draft.
 */
export function PageEditor({
  pageKey,
  origin,
}: {
  pageKey: PageKey
  /** Public site origin for the SEO previews. */
  origin?: string
}) {
  const canEdit = usePermission({ page: ["update"] })
  const canPublish = usePermission({ page: ["publish"] })
  const canReadSeo = usePermission({ seo: ["read"] })
  const canCreate = usePermission({ page: ["create"] })
  const template = PAGES[pageKey]
  const param = { key: pageKey }
  return (
    <VersionedEditor
      title={PAGE_LABELS[pageKey]}
      backHref="/admin/pages"
      backLabel="All pages"
      path={PAGE_PATHS[pageKey]}
      queryKey={["pages", pageKey]}
      load={() => unwrap(api.pages[":key"].$get({ param }))}
      saveDraft={(draft, version) =>
        unwrap(
          api.pages[":key"].draft.$put({ param, json: { draft, version } })
        )
      }
      publish={(version) =>
        unwrap(api.pages[":key"].publish.$post({ param, json: { version } }))
      }
      restore={(revisionId, version) =>
        unwrap(
          api.pages[":key"].restore.$post({
            param,
            json: { revisionId, version },
          })
        )
      }
      schema={templates[template].schema}
      meta={templateEditorMeta[template]}
      revisions={{ entity: "page", id: pageKey }}
      previewHref={previewHref("page", pageKey)}
      publicHref={PAGE_PATHS[pageKey]}
      canEdit={canEdit}
      canPublish={canPublish}
      actions={(ctx) => (
        <>
          {canCreate ? (
            <CopyToNewPage pageKey={pageKey} draft={ctx.draft} />
          ) : null}
          <SeoLink />
        </>
      )}
      seo={
        canReadSeo
          ? (ctx) => (
              <EditorSeoTab
                kind="page"
                id={pageKey}
                origin={origin}
                onFieldFocus={ctx.onSeoFieldFocus}
                names={{
                  live: textAt(
                    ctx.record.published ?? ctx.record.draft,
                    "hero",
                    "title"
                  ),
                  draft: textAt(ctx.draft, "hero", "title"),
                }}
              />
            )
          : undefined
      }
    />
  )
}

/** "Copy to new page": the draft's sections as a new builder page (R10-11). */
function CopyToNewPage({
  pageKey,
  draft,
}: {
  pageKey: PageKey
  draft: unknown
}) {
  const [copy, setCopy] = useState<CopySeed | null>(null)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={EDITOR_ACTION}
        onClick={() => {
          const parsed = templates[PAGES[pageKey]].schema.safeParse(draft)
          if (!parsed.success)
            return void toast.error("Not copied", {
              description: "Fill in the marked fields first.",
            })
          setCopy({
            title: `${PAGE_LABELS[pageKey]} copy`,
            slug: `${pageKey}-copy`,
            seed: {
              blocks: blocksFromTemplate(
                pageKey,
                parsed.data as PageData<PageKey>
              ),
            },
          })
        }}
      >
        <Copy aria-hidden />
        Copy to new page
      </Button>
      <NewPageDialog
        open={copy !== null}
        onOpenChange={(open) => {
          if (!open) setCopy(null)
        }}
        copy={copy ?? undefined}
      />
    </>
  )
}
