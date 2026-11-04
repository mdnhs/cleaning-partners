import "server-only"

import type { DbOrTx } from "@/server/db/client"
import { jobApplicationEvents, jobApplications } from "@/server/db/schema"

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
