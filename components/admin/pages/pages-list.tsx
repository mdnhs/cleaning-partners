"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, type ReactNode } from "react"

import {
  BUILDER_PAGES_KEY,
  NewPageDialog,
} from "@/components/admin/builder/new-page-dialog"

import { ContentStatusPills } from "@/components/admin/kit/content-status"
import { EmptyState } from "@/components/admin/kit/empty-state"
import { RelativeTime } from "@/components/admin/kit/relative-time"
import { CardSkeleton } from "@/components/admin/kit/skeletons"
import { FORM_ACTION, PRIMARY_ACTION } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePermission } from "@/hooks/use-permission"
import { api, errorMessage, unwrap } from "@/lib/api-client"
import { builderPath } from "@/lib/schemas/api/builder-pages"

/** One row of either list. */
type PageRow = {
  key: string
  label: string
  href: string
  path: string
  publishedAt: string | null
  dirty: boolean
  updatedAt: string
  updatedBy: { name: string } | null
}

const stateOf = (page: PageRow) => ({
  published: page.publishedAt ? true : null,
  dirty: page.dirty,
})

/** Relative to the last fetch, so it moves on with every refetch. */
function Updated({ page, now }: { page: PageRow; now: number }) {
  return (
    <RelativeTime
      iso={page.updatedAt}
      now={now}
      suffix={page.updatedBy ? ` · ${page.updatedBy.name}` : undefined}
    />
  )
}

/**
 * The site's seven fixed pages, then the custom (builder) pages; "New page"
 * (page:create) or `?new=1` opens the dialog.
 */
export function PagesList() {
  const canCreate = usePermission({ page: ["create"] })
  const router = useRouter()
  const pathname = usePathname()
  const wantsNew = useSearchParams()?.get("new") === "1"
  const [opened, setOpened] = useState(false)
  return (
    <div className="flex flex-col gap-10">
      <Section title="Site pages">
        <SitePagesList />
      </Section>
      <Section
        title="Custom pages"
        action={
          canCreate ? (
            <Button
              type="button"
              className={PRIMARY_ACTION}
              onClick={() => setOpened(true)}
            >
              <Plus aria-hidden />
              New page
            </Button>
          ) : undefined
        }
      >
        <CustomPagesList />
      </Section>
      {canCreate ? (
        <NewPageDialog
          open={opened || wantsNew}
          onOpenChange={(open) => {
            if (open) return setOpened(true)
            setOpened(false)
            if (wantsNew && pathname) router.replace(pathname)
          }}
        />
      ) : null}
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const fixedRow = (page: {
  key: string
  label: string
  path: string
  publishedAt: string | null
  dirty: boolean
  updatedAt: string
  updatedBy: { name: string } | null
}): PageRow => ({ ...page, href: `/admin/pages/${page.key}` })

/** The seven fixed pages (JW pages list). */
function SitePagesList() {
  const pages = useQuery({
    queryKey: ["pages"],
    queryFn: () => unwrap(api.pages.$get()),
  })
  if (pages.isPending) return <Loading what="pages" />
  if (pages.isError) return <LoadError what="pages" query={pages} />
  if (pages.data.items.length === 0)
    return (
      <EmptyState
        icon={FileText}
        title="No pages yet"
        description="The site's pages appear here once the content is seeded."
      />
    )
  return (
    <PageRows
      label="Site pages"
      rows={pages.data.items.map(fixedRow)}
      now={pages.dataUpdatedAt}
    />
  )
}

/** The builder pages: /p/<address>, each opening the builder. */
function CustomPagesList() {
  const pages = useQuery({
    queryKey: BUILDER_PAGES_KEY,
    queryFn: () =>
      unwrap(api["builder-pages"].$get({ query: { pageSize: "100" } })),
  })
  if (pages.isPending) return <Loading what="custom pages" />
  if (pages.isError) return <LoadError what="custom pages" query={pages} />
  if (pages.data.items.length === 0)
    return (
      <EmptyState
        icon={FileText}
        title="No custom pages yet"
        description="Build a landing page from the site's sections, at its own address."
      />
    )
  return (
    <PageRows
      label="Custom pages"
      rows={pages.data.items.map((page) => ({
        key: page.id,
        label: page.title,
        href: `/admin/pages/custom/${page.id}`,
        path: builderPath(page.slug),
        publishedAt: page.publishedAt,
        dirty: page.dirty,
        updatedAt: page.updatedAt,
        updatedBy: page.updatedBy,
      }))}
      now={pages.dataUpdatedAt}
    />
  )
}

function Loading({ what }: { what: string }) {
  return (
    <div role="status">
      <span className="sr-only">Loading {what}…</span>
      <CardSkeleton />
    </div>
  )
}

function LoadError({
  what,
  query,
}: {
  what: string
  query: { error: Error | null; refetch: () => unknown }
}) {
  return (
    <EmptyState
      role="alert"
      title={`The ${what} didn't load`}
      description={errorMessage(query.error)}
      action={
        <Button
          type="button"
          className={FORM_ACTION}
          onClick={() => query.refetch()}
        >
          Try again
        </Button>
      }
    />
  )
}

/** Card table ≥ 640 px, cards below. */
function PageRows({
  label,
  rows,
  now,
}: {
  label: string
  rows: PageRow[]
  now: number
}) {
  return (
    <>
      <div
        data-slot="table-card"
        className="rounded-card hidden overflow-hidden bg-card sm:block"
      >
        <Table>
          <TableCaption className="sr-only">{label}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                scope="col"
                className="whitespace-normal text-muted-foreground"
              >
                Title
              </TableHead>
              <TableHead
                scope="col"
                className="whitespace-normal text-muted-foreground"
              >
                Address
              </TableHead>
              <TableHead
                scope="col"
                className="whitespace-normal text-muted-foreground"
              >
                Status
              </TableHead>
              <TableHead
                scope="col"
                className="whitespace-normal text-muted-foreground"
              >
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((page) => (
              <TableRow key={page.key} className="hover:bg-muted/40">
                <TableCell className="whitespace-normal">
                  <Link
                    href={page.href}
                    className="font-semibold underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {page.label}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <code className="font-mono text-xs text-muted-foreground">
                    {page.path}
                  </code>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <ContentStatusPills record={stateOf(page)} />
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  <Updated page={page} now={now} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label={label} className="flex flex-col gap-3 sm:hidden">
        {rows.map((page) => (
          <li key={page.key} className="rounded-card relative bg-card p-4">
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href={page.href}
                className="after:rounded-card font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {page.label}
              </Link>
              <code className="font-mono text-xs text-muted-foreground">
                {page.path}
              </code>
              <ContentStatusPills record={stateOf(page)} />
              <p className="text-xs text-muted-foreground">
                Updated <Updated page={page} now={now} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
