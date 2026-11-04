import "server-only"

import { purgeExpiredApplications } from "@/server/modules/applications/service"

import type { JobDefinition } from "./index"

/** Careers retention: applications (and CVs) past Settings › Careers retentionMonths, daily. */
export const purgeApplicationsJob: JobDefinition = {
  name: "purge-applications",
  key: "purge-applications",
  everyMs: 24 * 60 * 60_000,
  async run({ now }) {
    await purgeExpiredApplications(now)
    return {}
  },
}
