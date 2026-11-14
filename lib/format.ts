// Display formatting for the admin (global constraint: Europe/Dublin, en-IE).
export const SITE_TIME_ZONE = "Europe/Dublin"
export const SITE_LOCALE = "en-IE"

const dateTime = new Intl.DateTimeFormat(SITE_LOCALE, {
  timeZone: SITE_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
})

/** "16 Oct 2026, 14:05" in Irish time, from an ISO string or Date. */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === "string" ? new Date(value) : value)
}

/** Short device label from a user agent ("Chrome on macOS"); "Unknown device" if empty. */
export function describeUserAgent(
  userAgent: string | null | undefined
): string {
  if (!userAgent) return "Unknown device"
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null
  if (browser && os) return `${browser} on ${os}`
  return browser ?? os ?? "Unknown device"
}

// Public dates. Article and job dates read "12 Sep 2026" in the site's
// language (settings.site.locale) and time zone (settings.site.timezone).
export const DEFAULT_SITE_LOCALE = "en"

/** Locale and IANA zone for a public date; either falls back when blank or invalid. */
export type DateOptions = { locale?: string; timeZone?: string }

/**
 * The public site's language: settings.site.locale when Intl supports it,
 * else "en" (a blank or mistyped tag such as "english" never breaks a page).
 */
export function siteLocale(value: string | null | undefined): string {
  const tag = value?.trim()
  if (!tag) return DEFAULT_SITE_LOCALE
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(tag).length > 0
      ? tag
      : DEFAULT_SITE_LOCALE
  } catch {
    // RangeError: not a well-formed language tag.
    return DEFAULT_SITE_LOCALE
  }
}

const calendarDates = new Map<string, Intl.DateTimeFormat>()

/** "YYYY-MM-DD" parts formatter for an IANA zone; null when the zone is unknown. */
function calendarDateIn(timeZone: string): Intl.DateTimeFormat | null {
  const cached = calendarDates.get(timeZone)
  if (cached) return cached
  try {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    calendarDates.set(timeZone, format)
    return format
  } catch {
    return null
  }
}

/**
 * The public site's time zone: settings.site.timezone when it is a valid
 * IANA name, else Europe/Dublin (a blank or mistyped value never breaks a page).
 */
export function siteTimeZone(value: string | null | undefined): string {
  const zone = value?.trim()
  return zone && calendarDateIn(zone) ? zone : SITE_TIME_ZONE
}

/** Calendar date as "2026-09-20" (for <time dateTime>) in `timeZone` (default Irish time). */
export function isoDate(
  value: Date,
  timeZone: string = SITE_TIME_ZONE
): string {
  const format = calendarDateIn(siteTimeZone(timeZone))!
  const parts = Object.fromEntries(
    format.formatToParts(value).map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * "<day> <short month> <year>" in the site's language and zone, always in
 * that order ("12 Sep 2026"; "12 sept. 2026" in fr).
 */
export function formatDay(
  value: Date,
  {
    locale,
    timeZone,
    day = "numeric",
  }: DateOptions & { day?: "2-digit" | "numeric" }
): string {
  const parts = new Intl.DateTimeFormat(siteLocale(locale), {
    timeZone: siteTimeZone(timeZone),
    day,
    month: "short",
    year: "numeric",
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""
  return `${part("day")} ${part("month")} ${part("year")}`
}

/** "20 Sep 2026" in `timeZone` and `locale`, default Irish time in en (article cards and headers). */
export function formatPostDate(
  value: Date,
  timeZone: string = SITE_TIME_ZONE,
  locale: string = DEFAULT_SITE_LOCALE
): string {
  return formatDay(value, { locale, timeZone, day: "2-digit" })
}

// Schedule dialog: <input type="datetime-local"> holds Irish wall-clock time.
const wallClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: SITE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function wallClockParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    wallClock.formatToParts(date).map((p) => [p.type, p.value])
  )
}

/** Minutes Irish time is ahead of UTC at `date` (0 in winter, 60 in summer). */
function dublinOffsetMinutes(date: Date): number {
  const p = wallClockParts(date)
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  )
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000)
}

/** "2026-07-01T10:00": the Irish wall-clock time of an instant (datetime-local value). */
export function toDublinInput(date: Date): string {
  const p = wallClockParts(date)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/**
 * The instant an Irish wall-clock time denotes; null when malformed. A time
 * skipped by the spring change (01:xx on the last Sunday of March) moves
 * one hour later; a time repeated in autumn takes the later (GMT) instant.
 */
export function fromDublinInput(value: string): Date | null {
  const match = LOCAL_INPUT.exec(value)
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    // Days in that month (day 0 of the next month), leap years included.
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59
  )
    return null
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  const first = naive - dublinOffsetMinutes(new Date(naive)) * 60_000
  return new Date(naive - dublinOffsetMinutes(new Date(first)) * 60_000)
}
