import type { StatusTone } from "@/components/admin/kit/status-pill"
import type { ApplicationStatus } from "@/lib/schemas/api/applications"

/** Same tones as the enquiry badges: new is info, in progress warning, outcomes success/danger. */
export const APPLICATION_STATUS_BADGE: Record<ApplicationStatus, StatusTone> = {
  new: "info",
  reviewing: "warning",
  shortlisted: "warning",
  interview: "warning",
  hired: "success",
  rejected: "danger",
  spam: "danger",
}

/** The CSV export of what the inbox shows. */
export function applicationExportHref(f: {
  status?: string
  jobId?: string
  q?: string
}): string {
  const params = new URLSearchParams()
  for (const key of ["status", "jobId", "q"] as const)
    if (f[key]) params.set(key, f[key])
  const query = params.toString()
  return `/api/v1/admin/applications/export.csv${query ? `?${query}` : ""}`
}

export const applicationHref = (id: string) =>
  `/admin/careers/applications/${encodeURIComponent(id)}`

export const applicationCvHref = (id: string) =>
  `/api/v1/admin/applications/${encodeURIComponent(id)}/cv`
