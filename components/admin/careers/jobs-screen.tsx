"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowUpDown, Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import {
  loadAllPages,
  ReorderPanel,
} from "@/components/admin/collections/reorder-panel"
import {
  columnsFor,
  DataTable,
  type DataTableColumns,
} from "@/components/admin/data-table/data-table"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { RelativeTime } from "@/components/admin/kit/relative-time"
import {
  LINK_PRIMARY,
  PageHeader,
  SECONDARY_ACTION,
} from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePermission } from "@/hooks/use-permission"
import { api, errorMessage, unwrap } from "@/lib/api-client"
import type { JobListItem, JobListStatus } from "@/lib/schemas/api/job-postings"

type Row = JobListItem & Record<string, unknown>
const ch = columnsFor<Row>()

const TABS: { value: JobListStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "draft", label: "Drafts" },
]

const queryKey = ["job-postings"] as const

/** Open (taking applications), Closed (published, no longer open), Draft (never published). */
export function JobStatusPills({ job }: { job: JobListItem }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {job.publishedAt === null ? (
        <StatusPill tone="neutral">Draft</StatusPill>
      ) : job.open ? (
        <StatusPill tone="success">Open</StatusPill>
      ) : (
        <StatusPill tone="neutral">Closed</StatusPill>
      )}
      {job.publishedAt !== null && job.dirty ? (
        <StatusPill tone="warning">Unpublished changes</StatusPill>
      ) : null}
    </span>
  )
}

/** Close (the role is filled) or reopen a published job, from the list. */
function OpenCloseButton({ job }: { job: JobListItem }) {
  const queryClient = useQueryClient()
  const closing = job.closedAt === null
  const action = useMutation({
    mutationFn: () => {
      const route = api["job-postings"][":id"]
      const args = { param: { id: job.id }, json: { version: job.version } }
      return unwrap(
        closing ? route.close.$post(args) : route.reopen.$post(args)
      )
    },
    onSuccess: async () => {
      toast.success(closing ? `${job.title} closed` : `${job.title} reopened`)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) =>
      toast.error(closing ? "Not closed" : "Not reopened", {
        description: errorMessage(err),
      }),
  })
  if (job.publishedAt === null) return null
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={action.isPending}
      aria-label={`${closing ? "Close" : "Reopen"} ${job.title}`}
      onClick={() => action.mutate()}
    >
      {closing ? "Close" : "Reopen"}
    </Button>
  )
}

function columns(canPublish: boolean) {
  return ch.columns([
    ch.accessor("title", {
      header: "Job",
      cell: (info) => (
        <Link
          href={`/admin/careers/${info.row.original.id}`}
          className="font-semibold underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    ch.accessor("category", { header: "Category", enableSorting: false }),
    ch.accessor("location", { header: "Location", enableSorting: false }),
    ch.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => <JobStatusPills job={row.original} />,
    }),
    ch.accessor("updatedAt", {
      header: "Updated",
      cell: (info) => (
        <span className="text-muted-foreground">
          <RelativeTime iso={info.getValue()} />
        </span>
      ),
    }),
    ...(canPublish
      ? [
          ch.display({
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => <OpenCloseButton job={row.original} />,
          }),
        ]
      : []),
  ]) as unknown as DataTableColumns<Row>
}

/** Job postings (careers): status tabs, new job, display order, close/reopen. */
export function JobsScreen() {
  const canCreate = usePermission({ job: ["create"] })
  const canUpdate = usePermission({ job: ["update"] })
  const canPublish = usePermission({ job: ["publish"] })
  const [reordering, setReordering] = useState(false)
  const [status, setStatus] = useState<JobListStatus>("all")
  return (
    <>
      <PageHeader
        title="Jobs"
        description="Each job has a row on /careers and its own page with an application form. Edits are drafts until published."
        actions={
          <>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className={SECONDARY_ACTION}
                onClick={() => setReordering((v) => !v)}
                aria-pressed={reordering}
              >
                <ArrowUpDown aria-hidden />
                {reordering ? "Back to list" : "Change order"}
              </Button>
            ) : null}
            {canCreate ? (
              <Link href="/admin/careers/new" className={LINK_PRIMARY}>
                <Plus aria-hidden />
                New job
              </Link>
            ) : null}
          </>
        }
      />
      {reordering ? (
        <ReorderPanel
          collection="jobs"
          label="Jobs order"
          queryKey={queryKey}
          load={async () => {
            const items = await loadAllPages((page, pageSize) =>
              unwrap(
                api["job-postings"].$get({
                  query: {
                    page: String(page),
                    pageSize: String(pageSize),
                    sort: "sortOrder:asc",
                  },
                })
              )
            )
            return items.map((job) => ({
              id: job.id,
              label: job.title,
              description: job.path,
            }))
          }}
          onDone={() => setReordering(false)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Tabs
            value={status}
            onValueChange={(value) => setStatus(value as JobListStatus)}
          >
            <TabsList aria-label="Job status">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DataTable<Row>
            key={status}
            syncUrl
            label="Jobs"
            queryKey={[...queryKey, status]}
            fetchPage={async (params) =>
              (await unwrap(
                api["job-postings"].$get({
                  query: {
                    status,
                    page: String(params.page),
                    pageSize: String(params.pageSize),
                    sort: params.sort,
                    q: params.q,
                  },
                })
              )) as {
                items: Row[]
                page: number
                pageSize: number
                total: number
              }
            }
            columns={columns(canPublish)}
            renderCard={(row) => (
              <div className="rounded-card flex items-center gap-3 bg-card p-4">
                <Link
                  href={`/admin/careers/${row.id}`}
                  className="flex min-w-0 flex-1 flex-col outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="font-semibold">{row.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {row.category} · {row.location}
                  </span>
                </Link>
                <JobStatusPills job={row} />
                {canPublish ? <OpenCloseButton job={row} /> : null}
              </div>
            )}
            empty="No jobs here"
            emptyDescription="Each job added here gets a row on /careers and its own page."
            emptyAction={
              canCreate ? (
                <Link href="/admin/careers/new" className={LINK_PRIMARY}>
                  <Plus aria-hidden />
                  New job
                </Link>
              ) : null
            }
          />
        </div>
      )}
    </>
  )
}
