/** The careers pages and the application endpoint use Irish calendar days. */
const IRISH_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Dublin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today's date in Ireland, "YYYY-MM-DD". */
export function irishToday(now: Date): string {
  return IRISH_DATE.format(now)
}

/**
 * A job takes applications when it is published, has not been closed by
 * hand, and its closing date (an Irish calendar day, inclusive) has not
 * passed. Isomorphic: the pages and the API share it.
 */
export function isOpenJob(
  job: {
    published: unknown
    closedAt: Date | null
    closingDate: string | null
  },
  now: Date
): boolean {
  if (job.published == null || job.closedAt !== null) return false
  return job.closingDate === null || job.closingDate >= irishToday(now)
}
