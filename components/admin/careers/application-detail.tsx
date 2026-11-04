"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/admin/kit/empty-state"
import { CardSkeleton } from "@/components/admin/kit/skeletons"
import { OptionSelect } from "@/components/admin/option-select"
import {
  FORM_ACTION,
  LINK_SECONDARY,
  PageHeader,
} from "@/components/admin/page-header"
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
import { Textarea } from "@/components/ui/textarea"
import { usePermission } from "@/hooks/use-permission"
import { applicationCvHref } from "@/lib/admin/applications"
import { api, ApiError, errorMessage, unwrap } from "@/lib/api-client"
import { formatDateTime } from "@/lib/format"
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationDto,
  type ApplicationStatus,
} from "@/lib/schemas/api/applications"

import { ApplicationStatusBadge, applicationsKey } from "./applications-screen"

const LIST_HREF = "/admin/careers/applications"
const detailKey = (id: string) => [...applicationsKey, "detail", id] as const

function Card({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="rounded-card flex min-w-0 flex-col gap-4 bg-card p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="text-sm break-words whitespace-pre-wrap">
            {value === null || value === "" ? (
              <span className="text-muted-foreground">
                <span aria-hidden>—</span>
                <span className="sr-only">Not given</span>
              </span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const yesNo = (v: boolean) => (v ? "Yes" : "No")
const list = (v: string[]) => (v.length ? v.join(", ") : null)
const kb = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * One application: the applicant's answers, the CV download, the status,
 * notes with the history, and deletion (which also deletes the CV).
 */
export function ApplicationDetail({ id }: { id: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const canUpdate = usePermission({ lead: ["update"] })
  const canDelete = usePermission({ lead: ["delete"] })
  const statusId = useId()
  const [note, setNote] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const app = useQuery({
    queryKey: detailKey(id),
    queryFn: async () =>
      (await unwrap(
        api.applications[":id"].$get({ param: { id } })
      )) as ApplicationDto,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  })

  const saved = (dto: ApplicationDto) => {
    queryClient.setQueryData(detailKey(id), dto)
    void queryClient.invalidateQueries({
      queryKey: applicationsKey,
      predicate: (q) => q.queryKey[1] !== "detail",
    })
  }
  const status = useMutation({
    mutationFn: async (next: ApplicationStatus) =>
      (await unwrap(
        api.applications[":id"].$patch({
          param: { id },
          json: { status: next },
        })
      )) as ApplicationDto,
    onSuccess: (dto) => {
      saved(dto)
      toast.success("Status saved")
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const addNote = useMutation({
    mutationFn: async () =>
      (await unwrap(
        api.applications[":id"].notes.$post({
          param: { id },
          json: { body: note },
        })
      )) as ApplicationDto,
    onSuccess: (dto) => {
      saved(dto)
      setNote("")
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: async () =>
      unwrap(api.applications[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsKey })
      toast.success("Application deleted")
      router.push(LIST_HREF)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const back = (
    <Link
      href={LIST_HREF}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Applications
    </Link>
  )

  if (app.isPending)
    return (
      <div role="status">
        <span className="sr-only">Loading the application…</span>
        <CardSkeleton />
      </div>
    )
  if (app.isError)
    return (
      <>
        <PageHeader title="Application" breadcrumbs={back} />
        <EmptyState
          role="alert"
          title={
            app.error instanceof ApiError && app.error.status === 404
              ? "This application no longer exists"
              : "The application didn't load"
          }
          description={errorMessage(app.error)}
        />
      </>
    )

  const a = app.data
  const answers = a.answers
  return (
    <>
      <PageHeader
        title={a.name}
        breadcrumbs={back}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={a.status} />
            <span>
              {a.jobTitle
                ? `${a.jobTitle}${a.jobReference ? ` · ${a.jobReference}` : ""}`
                : "Talent pool (CV)"}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time>
          </span>
        }
        actions={
          canDelete ? (
            <Button
              type="button"
              variant="outline"
              className={FORM_ACTION}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          ) : null
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Personal details">
            <Facts
              items={[
                [
                  "Email",
                  <a
                    key="e"
                    href={`mailto:${a.email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {a.email}
                  </a>,
                ],
                [
                  "Phone",
                  <a
                    key="p"
                    href={`tel:${a.phone.replace(/\s+/g, "")}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {a.phone}
                  </a>,
                ],
                ["Address", a.address],
                ["Town / County", a.town],
                ["Eircode", a.eircode],
              ]}
            />
          </Card>
          <Card title="Eligibility & availability">
            <Facts
              items={[
                ["Right to work", answers.rightToWork],
                ["Permission expiry", answers.permissionExpiry],
                ["Garda vetting", yesNo(answers.gardaVetting)],
                ["Lived abroad 6+ months", yesNo(answers.livedAbroad)],
                ["Earliest start", answers.startDate],
                ["Hours per week", answers.hoursPerWeek],
                ["Shifts", list(answers.shifts)],
                ["Driving / transport", yesNo(answers.transport)],
              ]}
            />
          </Card>
          <Card title="Experience">
            <Facts
              items={[
                ["Cleaning experience", answers.experience],
                ["Healthcare experience", answers.healthcareExperience],
                ["Most recent role", answers.recentRole],
                ["Certificates", list(answers.certificates)],
                ["Note", a.note],
                ["Heard about", a.heardAbout],
              ]}
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title="CV">
            {a.cv ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm break-words">
                  {a.cv.name}{" "}
                  <span className="text-muted-foreground">
                    ({kb(a.cv.size)})
                  </span>
                </p>
                <a
                  href={applicationCvHref(a.id)}
                  download
                  className={LINK_SECONDARY}
                >
                  <Download aria-hidden />
                  Download CV
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No CV uploaded.</p>
            )}
          </Card>
          <Card title="Status">
            <label htmlFor={statusId} className="sr-only">
              Status
            </label>
            <OptionSelect
              id={statusId}
              className="w-full"
              value={a.status}
              disabled={!canUpdate || status.isPending}
              onChange={(value) => status.mutate(value as ApplicationStatus)}
              options={APPLICATION_STATUSES.map((s) => ({
                value: s,
                label: APPLICATION_STATUS_LABELS[s],
              }))}
            />
            <Facts
              items={[
                ["Keep on file", yesNo(a.keepOnFile)],
                ["Privacy consent", yesNo(a.privacyConsent)],
                ["Sent from", a.sourcePage],
              ]}
            />
          </Card>
          <Card title="Notes & history">
            {canUpdate ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (note.trim()) addNote.mutate()
                }}
              >
                <label htmlFor={`${statusId}-note`} className="sr-only">
                  Add a note
                </label>
                <Textarea
                  id={`${statusId}-note`}
                  value={note}
                  maxLength={5000}
                  placeholder="Add a note (only staff see it)"
                  onChange={(event) => setNote(event.target.value)}
                />
                <Button
                  type="submit"
                  className={FORM_ACTION}
                  disabled={!note.trim() || addNote.isPending}
                >
                  Add note
                </Button>
              </form>
            ) : null}
            <ol className="flex flex-col gap-3">
              {[...a.events].reverse().map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-1 border-l-2 border-border pl-3"
                >
                  <span className="text-xs text-muted-foreground">
                    {event.actor?.name ?? "Website"} ·{" "}
                    <time dateTime={event.createdAt}>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </span>
                  {event.body ? (
                    <span className="text-sm break-words whitespace-pre-wrap">
                      {event.body}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The CV, notes and history are deleted too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Delete application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
