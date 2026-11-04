"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { NewPageDialog } from "@/components/admin/builder/new-page-dialog"
import { ContentStatusPills } from "@/components/admin/kit/content-status"
import { EmptyState } from "@/components/admin/kit/empty-state"
import { RelativeTime } from "@/components/admin/kit/relative-time"
import { CardSkeleton } from "@/components/admin/kit/skeletons"
import { PRIMARY_ACTION } from "@/components/admin/page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { usePermission } from "@/hooks/use-permission"
import { api, ApiError, errorMessage, unwrap } from "@/lib/api-client"
import type { BuilderPageListItem } from "@/lib/schemas/api/builder-pages"

/** Query key of the legal pages list (a child of the builder pages key). */
export const LEGAL_PAGES_KEY = ["builder-pages", "legal"] as const

/**
 * Legal pages (Privacy, Terms, Cookies …): a list in footer order with
 * create, edit (the page builder), reorder and delete. Published pages
 * appear in the site footer in this order.
 */
export function LegalPagesScreen() {
  const canCreate = usePermission({ page: ["create"] })
  const canUpdate = usePermission({ page: ["update"] })
  const canDelete = usePermission({ page: ["delete"] })
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<BuilderPageListItem | null>(null)

  const pages = useQuery({
    queryKey: LEGAL_PAGES_KEY,
    queryFn: () =>
      unwrap(
        api["builder-pages"].$get({
          query: { kind: "legal", pageSize: "100" },
        })
      ),
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      unwrap(api["builder-pages"]["legal-order"].$put({ json: { ids } })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: LEGAL_PAGES_KEY }),
    onError: (error) =>
      toast.error("Order not saved", { description: errorMessage(error) }),
  })

  if (pages.isPending)
    return (
      <div role="status">
        <span className="sr-only">Loading legal pages…</span>
        <CardSkeleton />
      </div>
    )
  if (pages.isError)
    return (
      <EmptyState
        role="alert"
        title="The legal pages didn't load"
        description={errorMessage(pages.error)}
      />
    )

  const items = pages.data.items
  const move = (index: number, by: -1 | 1) => {
    const ids = items.map((page) => page.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Published legal pages appear in the footer, in this order. Each one
          lives at its own address, such as /privacy-policy.
        </p>
        {canCreate ? (
          <Button
            type="button"
            className={PRIMARY_ACTION}
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden />
            New legal page
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No legal pages yet"
          description="Add a Privacy Policy, Terms of Service or Cookie Policy. It stays a draft until you publish it."
        />
      ) : (
        <ol aria-label="Legal pages" className="flex flex-col gap-3">
          {items.map((page, index) => (
            <li
              key={page.id}
              className="rounded-card flex flex-wrap items-center gap-x-4 gap-y-2 bg-card p-4"
            >
              <span
                aria-hidden
                className="w-6 text-sm font-semibold text-muted-foreground tabular-nums"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                <Link
                  href={`/admin/pages/custom/${page.id}`}
                  className="font-semibold underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {page.title}
                </Link>
                <code className="font-mono text-xs text-muted-foreground">
                  {page.path}
                </code>
              </div>
              <ContentStatusPills
                record={{ published: page.publishedAt, dirty: page.dirty }}
              />
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                <RelativeTime iso={page.updatedAt} now={pages.dataUpdatedAt} />
              </p>
              <div className="flex items-center gap-1">
                {canUpdate ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${page.title} up`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${page.title} down`}
                      disabled={index === items.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${page.title}`}
                  render={<Link href={`/admin/pages/custom/${page.id}`} />}
                >
                  <Pencil aria-hidden />
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${page.title}`}
                    onClick={() => setRemoving(page)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {canCreate ? (
        <NewPageDialog legal open={creating} onOpenChange={setCreating} />
      ) : null}
      <DeleteDialog page={removing} onClose={() => setRemoving(null)} />
    </div>
  )
}

function DeleteDialog({
  page,
  onClose,
}: {
  page: BuilderPageListItem | null
  onClose(): void
}) {
  const queryClient = useQueryClient()
  const [redirectHome, setRedirectHome] = useState(false)
  const remove = useMutation({
    mutationFn: (target: BuilderPageListItem) =>
      unwrap(
        api["builder-pages"][":id"].$delete({
          param: { id: target.id },
          query: {
            version: String(target.version),
            redirectHome: redirectHome ? "true" : "false",
          },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["builder-pages"] })
      toast.success("Legal page deleted")
      onClose()
    },
    onError: async (error) => {
      // A stale version: someone saved the page meanwhile. Reload the list.
      if (error instanceof ApiError)
        await queryClient.invalidateQueries({ queryKey: LEGAL_PAGES_KEY })
      toast.error("Not deleted", { description: errorMessage(error) })
    },
  })
  const published = page?.publishedAt != null
  return (
    <AlertDialog
      open={page !== null}
      onOpenChange={(open) => {
        if (!open && !remove.isPending) {
          setRedirectHome(false)
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{page?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {published
              ? `${page?.path} is live. After deleting, that address shows a "page not found" screen and the footer link disappears. This can't be undone.`
              : "This draft and its revisions are deleted. This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {published ? (
          <label className="flex min-h-8 items-center gap-2 text-sm pointer-coarse:min-h-11">
            <Checkbox
              checked={redirectHome}
              onCheckedChange={(checked) => setRedirectHome(checked === true)}
            />
            Send visitors of this address to the home page instead
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault()
              if (page) remove.mutate(page)
            }}
          >
            {remove.isPending ? "Deleting…" : "Delete page"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
