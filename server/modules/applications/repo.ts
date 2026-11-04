import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm"

import {
  type ApplicationStatus,
  OPEN_APPLICATION_STATUSES,
} from "@/lib/schemas/api/applications"
import type { Sort } from "@/lib/schemas/api/list"
import type { DbOrTx } from "@/server/db/client"
import { containsPattern } from "@/server/db/like"
import {
  jobApplicationEvents,
  jobApplications,
  users,
} from "@/server/db/schema"

export type ApplicationRow = typeof jobApplications.$inferSelect
export type NewApplication = typeof jobApplications.$inferInsert

export async function insertApplication(
  db: DbOrTx,
  values: NewApplication
): Promise<ApplicationRow> {
  const [row] = await db.insert(jobApplications).values(values).returning()
  return row!
}

export async function insertApplicationEvent(
  db: DbOrTx,
  values: {
    applicationId: string
    type: string
    body: string | null
    actorId: string | null
  }
): Promise<void> {
  await db.insert(jobApplicationEvents).values(values)
}

export type ApplicationFilters = {
  status: ApplicationStatus | "open" | "all"
  jobId?: string
  q?: string
}
export type ApplicationSortField = "createdAt" | "name"

const t = jobApplications

function whereFor(f: ApplicationFilters): SQL | undefined {
  const c: (SQL | undefined)[] = []
  if (f.status === "open")
    c.push(inArray(t.status, [...OPEN_APPLICATION_STATUSES]))
  else if (f.status !== "all") c.push(eq(t.status, f.status))
  if (f.jobId) c.push(eq(t.jobId, f.jobId))
  if (f.q) {
    const p = containsPattern(f.q)
    c.push(
      or(
        ilike(t.firstName, p),
        ilike(t.surname, p),
        sql`(${t.firstName} || ' ' || ${t.surname}) ilike ${p}`,
        ilike(t.email, p),
        ilike(t.phone, p),
        ilike(t.town, p),
        ilike(t.jobTitle, p)
      )
    )
  }
  return and(...c)
}

/** Every column but the IP hash, plus the assignee's name. */
const columns = {
  id: t.id,
  jobId: t.jobId,
  jobTitle: t.jobTitle,
  jobReference: t.jobReference,
  firstName: t.firstName,
  surname: t.surname,
  email: t.email,
  phone: t.phone,
  address: t.address,
  town: t.town,
  eircode: t.eircode,
  answers: t.answers,
  note: t.note,
  heardAbout: t.heardAbout,
  declaration: t.declaration,
  privacyConsent: t.privacyConsent,
  keepOnFile: t.keepOnFile,
  cvKey: t.cvKey,
  cvDriver: t.cvDriver,
  cvName: t.cvName,
  cvMime: t.cvMime,
  cvSize: t.cvSize,
  status: t.status,
  assigneeId: t.assigneeId,
  assigneeName: users.name,
  sourcePage: t.sourcePage,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
}
export type ApplicationWithAssignee = Omit<ApplicationRow, "ipHash"> & {
  assigneeName: string | null
}

export async function listApplicationRows(
  db: DbOrTx,
  opts: {
    filters: ApplicationFilters
    sort: Sort<ApplicationSortField>
    page: number
    pageSize: number
  }
): Promise<{ rows: ApplicationWithAssignee[]; total: number }> {
  const where = whereFor(opts.filters)
  const [{ total }] = await db.select({ total: count() }).from(t).where(where)
  const dir = opts.sort.dir === "asc" ? asc : desc
  const order =
    opts.sort.field === "name"
      ? [dir(t.firstName), dir(t.surname)]
      : [dir(t.createdAt)]
  const rows = await db
    .select(columns)
    .from(t)
    .leftJoin(users, eq(users.id, t.assigneeId))
    .where(where)
    .orderBy(...order, desc(t.id))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
  return { rows, total }
}

export async function exportApplicationRows(
  db: DbOrTx,
  filters: ApplicationFilters,
  limit: number
): Promise<ApplicationWithAssignee[]> {
  return db
    .select(columns)
    .from(t)
    .leftJoin(users, eq(users.id, t.assigneeId))
    .where(whereFor(filters))
    .orderBy(desc(t.createdAt), desc(t.id))
    .limit(limit)
}

export async function findApplicationRow(
  db: DbOrTx,
  id: string
): Promise<ApplicationWithAssignee | null> {
  const [row] = await db
    .select(columns)
    .from(t)
    .leftJoin(users, eq(users.id, t.assigneeId))
    .where(eq(t.id, id))
  return row ?? null
}

export async function listApplicationEventRows(db: DbOrTx, id: string) {
  return db
    .select({
      id: jobApplicationEvents.id,
      type: jobApplicationEvents.type,
      body: jobApplicationEvents.body,
      actorId: jobApplicationEvents.actorId,
      actorName: users.name,
      createdAt: jobApplicationEvents.createdAt,
    })
    .from(jobApplicationEvents)
    .leftJoin(users, eq(users.id, jobApplicationEvents.actorId))
    .where(eq(jobApplicationEvents.applicationId, id))
    .orderBy(asc(jobApplicationEvents.createdAt), asc(jobApplicationEvents.id))
}

export async function lockApplicationRow(
  db: DbOrTx,
  id: string
): Promise<{ status: ApplicationStatus; assigneeId: string | null } | null> {
  const [row] = await db
    .select({ status: t.status, assigneeId: t.assigneeId })
    .from(t)
    .where(eq(t.id, id))
    .for("update")
  return row ?? null
}

export async function updateApplicationRow(
  db: DbOrTx,
  id: string,
  patch: { status?: ApplicationStatus; assigneeId?: string | null }
): Promise<void> {
  await db
    .update(t)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(t.id, id))
}

type StoredCv = { cvKey: string | null; cvDriver: "disk" | "r2" | null }

/** Deletes the row (its events cascade); returns its CV, or null if none existed. */
export async function deleteApplicationRow(
  db: DbOrTx,
  id: string
): Promise<StoredCv | null> {
  const [row] = await db
    .delete(t)
    .where(eq(t.id, id))
    .returning({ cvKey: t.cvKey, cvDriver: t.cvDriver })
  return row ?? null
}

/** Deletes applications received before `cutoff`; returns their CVs. */
export async function deleteApplicationsCreatedBefore(
  db: DbOrTx,
  cutoff: Date
): Promise<StoredCv[]> {
  return db
    .delete(t)
    .where(lt(t.createdAt, cutoff))
    .returning({ cvKey: t.cvKey, cvDriver: t.cvDriver })
}

export async function countNewApplications(db: DbOrTx): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(t)
    .where(and(eq(t.status, "new"), ne(t.status, "spam")))
  return total
}
