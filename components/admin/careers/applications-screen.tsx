"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  columnsFor,
  DataTable,
  type DataTableColumns,
} from "@/components/admin/data-table/data-table"
import { FilterSelect } from "@/components/admin/filter-field"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { CsvDownloadButton } from "@/components/admin/leads/csv-download-button"
import { PageHeader } from "@/components/admin/page-header"
import { usePermission } from "@/hooks/use-permission"
import {
  APPLICATION_STATUS_BADGE,
  applicationExportHref,
  applicationHref,
} from "@/lib/admin/applications"
import { api, unwrap } from "@/lib/api-client"
import { formatDateTime } from "@/lib/format"
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationListItem,
  type ApplicationStatus,
} from "@/lib/schemas/api/applications"
import type { JobListItem } from "@/lib/schemas/api/job-postings"
import type { Paginated } from "@/lib/schemas/api/list"

type Row = ApplicationListItem & Record<string, unknown>
const ch = columnsFor<Row>()

export const applicationsKey = ["applications"] as const

/** New / Reviewing / … / Hired / Not successful / Spam. */
export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus
}) {
  return (
    <StatusPill tone={APPLICATION_STATUS_BADGE[status]}>
      {APPLICATION_STATUS_LABELS[status]}
    </StatusPill>
  )
}

/** The job applied for; the talent pool when there is none. */
function JobCell({ app }: { app: ApplicationListItem }) {
  return app.jobTitle ? (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{app.jobTitle}</span>
      {app.jobReference ? (
        <span className="text-xs text-muted-foreground">
          {app.jobReference}
        </span>
      ) : null}
    </span>
  ) : (
    <span className="text-muted-foreground">Talent pool (CV)</span>
  )
}

// Column definitions live at module scope (TanStack Table needs stable references).
const columns = ch.columns([
  ch.accessor("createdAt", {
    header: "Received",
    cell: (info) => (
      <time
        dateTime={info.getValue()}
        className="whitespace-nowrap text-muted-foreground"
      >
        {formatDateTime(info.getValue())}
      </time>
    ),
  }),
  ch.accessor("name", {
    header: "Applicant",
    cell: (info) => (
      <span className="flex min-w-0 flex-col">
        <Link
          href={applicationHref(info.row.original.id)}
          className="font-semibold underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {info.getValue()}
        </Link>
        <span className="text-xs text-muted-foreground">
          {info.row.original.town}
        </span>
      </span>
    ),
  }),
  ch.display({
    id: "job",
    header: "Job",
    cell: ({ row }) => <JobCell app={row.original} />,
  }),
  ch.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: (info) => <ApplicationStatusBadge status={info.getValue()} />,
  }),
  ch.display({
    id: "cv",
    header: "CV",
    cell: ({ row }) =>
      row.original.hasCv ? (
        <FileText aria-label="CV attached" className="size-4 text-primary" />
      ) : (
        <span className="text-muted-foreground">
          <span aria-hidden>—</span>
          <span className="sr-only">No CV</span>
        </span>
      ),
  }),
]) as unknown as DataTableColumns<Row>

type StatusFilter = ApplicationStatus | "open" | "all"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "all", label: "Everything" },
  ...APPLICATION_STATUSES.map((s) => ({
    value: s,
    label: APPLICATION_STATUS_LABELS[s],
  })),
]

/**
 * Admin › Careers › Applications: everything sent through the careers
 * form, open ones first (new to interview). Filters by status and job;
 * a CSV export takes what the list shows. Each row opens its own page.
 */
export function ApplicationsScreen() {
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>("open")
  const [jobId, setJobId] = useState("")
  const [search, setSearch] = useState("")
  const canExport = usePermission({ lead: ["export"] })
  const canReadJobs = usePermission({ job: ["read"] })
  const jobs = useQuery({
    queryKey: ["job-postings", "options"],
    enabled: canReadJobs,
    queryFn: async () =>
      (
        (await unwrap(
          api["job-postings"].$get({
            query: { status: "all", page: "1", pageSize: "100" },
          })
        )) as Paginated<JobListItem>
      ).items,
  })

  return (
    <>
      <PageHeader
        title="Applications"
        description="Applications and CVs sent from the careers pages."
        actions={
          canExport ? (
            <CsvDownloadButton
              href={applicationExportHref({ status, jobId, q: search })}
            >
              Export CSV
            </CsvDownloadButton>
          ) : null
        }
      />
      <DataTable<Row>
        syncUrl
        label="Applications"
        queryKey={[...applicationsKey, status, jobId]}
        filterKey={status === "open" && !jobId ? "" : `${status}|${jobId}`}
        filteredEmpty="No applications match these filters"
        initialSort={[{ id: "createdAt", desc: true }]}
        searchPlaceholder="Search name, email, phone, town or job"
        toolbar={
          <>
            <FilterSelect
              id="applications-status"
              label="Status"
              value={status}
              onChange={(value) => setStatus((value || "open") as StatusFilter)}
              options={STATUS_OPTIONS}
            />
            {canReadJobs ? (
              <FilterSelect
                id="applications-job"
                label="Job"
                value={jobId}
                onChange={setJobId}
                options={[
                  { value: "", label: "Any job" },
                  ...(jobs.data ?? []).map((job) => ({
                    value: job.id,
                    label: job.title,
                  })),
                ]}
              />
            ) : null}
          </>
        }
        fetchPage={async (p) => {
          setSearch(p.q ?? "")
          return (await unwrap(
            api.applications.$get({
              query: {
                page: String(p.page),
                pageSize: String(p.pageSize),
                sort: p.sort,
                q: p.q,
                status,
                ...(jobId ? { jobId } : {}),
              },
            })
          )) as Paginated<Row>
        }}
        columns={columns}
        onRowClick={(app) => router.push(applicationHref(app.id))}
        renderCard={(app) => (
          <div className="rounded-card relative flex flex-col gap-2 bg-card p-4">
            <span className="flex items-start justify-between gap-2">
              <Link
                href={applicationHref(app.id)}
                className="after:rounded-card min-w-0 truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {app.name}
              </Link>
              <ApplicationStatusBadge status={app.status} />
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {app.jobTitle ?? "Talent pool (CV)"}
            </span>
            <time
              dateTime={app.createdAt}
              className="text-xs text-muted-foreground"
            >
              {formatDateTime(app.createdAt)}
            </time>
          </div>
        )}
        empty="No applications yet"
        emptyDescription="They appear here when someone applies on the careers pages."
      />
    </>
  )
}
