import type {
  CareersView,
  ClosedJobView,
  JobDetailView,
  JobRowView,
} from "@/components/careers/types"
import { irishToday, isOpenJob } from "@/lib/careers/open"
import { interpolate } from "@/lib/interpolate"
import { jobPath } from "@/lib/schemas/api/job-postings"
import type { PublicJob } from "@/server/modules/job-postings/queries"
import type { SiteSources } from "@/templates/shared/sources"
import { linkView, pageHeroView, textView } from "@/templates/shared/views"

const DAY = 24 * 60 * 60_000
/** "today", "yesterday", then "3 days ago"; weeks and months always as numbers. */
const RELATIVE_DAYS = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" })
const RELATIVE = new Intl.RelativeTimeFormat("en-IE", { numeric: "always" })
/** "Sep": en-US keeps the three-letter month the design uses. */
const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Dublin",
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "today", "3 days ago", "1 week ago", "2 months ago" (Irish calendar days). */
export function postedAgo(posted: Date, now: Date): string {
  const days = Math.round(
    (Date.parse(irishToday(now)) - Date.parse(irishToday(posted))) / DAY
  )
  if (days < 7) return RELATIVE_DAYS.format(-days, "day")
  if (days < 30) return RELATIVE.format(-Math.floor(days / 7), "week")
  return RELATIVE.format(-Math.floor(days / 30), "month")
}

/** "12 Sep 2026" for a moment (Irish date) or a "YYYY-MM-DD" day. */
export function closedOnDate(value: Date | string): string {
  const date =
    typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value
  const part = (type: string) =>
    PARTS.formatToParts(date).find((p) => p.type === type)?.value ?? ""
  return `${part("day")} ${part("month")} ${part("year")}`
}

/** A job as the public pages test openness (published content). */
export const openNow = (job: PublicJob, now: Date) =>
  isOpenJob(
    {
      published: job.published ? job.content : null,
      closedAt: job.closedAt,
      closingDate: job.content.closingDate,
    },
    now
  )

const unique = (values: string[]) => [...new Set(values)]

/**
 * Up to `max` other open jobs for "Similar Roles": the same category first,
 * then the most recently posted.
 */
export function similarJobs(
  current: PublicJob,
  all: PublicJob[],
  now: Date,
  max = 3
): PublicJob[] {
  const time = (job: PublicJob) => job.publishedAt?.getTime() ?? 0
  return all
    .filter((job) => job.id !== current.id && openNow(job, now))
    .sort((a, b) => {
      const sameA = a.content.category === current.content.category ? 0 : 1
      const sameB = b.content.category === current.content.category ? 0 : 1
      return sameA - sameB || time(b) - time(a)
    })
    .slice(0, max)
}

function jobRow(
  s: SiteSources,
  job: PublicJob,
  now: Date,
  postedLabel: string
): JobRowView {
  const c = job.content
  return {
    slug: job.slug,
    href: jobPath(job.slug),
    title: c.title,
    category: c.category,
    location: c.location,
    type: c.employmentType,
    hours: c.hours,
    pay: c.pay,
    posted: interpolate(postedLabel, {
      ago: job.publishedAt ? postedAgo(job.publishedAt, now) : "",
    }),
  }
}

function closedRow(job: PublicJob, closedOn: string): ClosedJobView {
  const c = job.content
  const when = job.closedAt ?? c.closingDate
  return {
    slug: job.slug,
    title: c.title,
    category: c.category,
    location: c.location,
    type: c.employmentType,
    hours: c.hours,
    pay: c.pay,
    closed: when ? interpolate(closedOn, { date: closedOnDate(when) }) : "",
  }
}

/** "/careers": the page copy around the open and the closed jobs. */
export function careersView(
  s: SiteSources,
  jobs: PublicJob[],
  now: Date
): CareersView {
  const page = s.pages.careers.data
  const open = jobs.filter((job) => openNow(job, now))
  // Previous openings: published jobs that are no longer open (never drafts).
  const previous = jobs.filter((job) => job.published && !openNow(job, now))
  const categories = unique(open.map((j) => j.content.category)).map(
    (name) => ({
      name,
      count: open.filter((j) => j.content.category === name).length,
    })
  )
  return {
    hero: pageHeroView(s, page.hero),
    why: {
      eyebrow: page.why.eyebrow,
      title: page.why.title,
      description: page.why.description,
      cards: page.why.cards.map((card) => ({
        title: card.title,
        description: card.description,
        icon: card.icon.url,
      })),
    },
    open: {
      eyebrow: page.open.eyebrow,
      title: page.open.title,
      intro: page.open.intro,
      count: interpolate(page.open.countLabel, { count: open.length }),
      searchPlaceholder: page.open.searchPlaceholder,
      allLocations: page.open.allLocations,
      allTypes: page.open.allTypes,
      openPill: page.open.openPill,
      viewJob: page.open.viewJob,
      emptyText: textView(s, page.open.emptyText),
      jobs: open.map((job) => jobRow(s, job, now, page.open.postedLabel)),
      filters: {
        allRoles: interpolate(page.open.allRoles, { count: open.length }),
        categories,
        locations: unique(open.map((j) => j.content.location)),
        types: unique(open.map((j) => j.content.employmentType)),
      },
    },
    previous: {
      eyebrow: page.previous.eyebrow,
      title: page.previous.title,
      intro: page.previous.intro,
      closedPill: page.previous.closedPill,
      filled: page.previous.filled,
      jobs: previous.map((job) => closedRow(job, page.previous.closedOn)),
    },
    process: {
      eyebrow: page.process.eyebrow,
      title: page.process.title,
      intro: page.process.intro,
      steps: page.process.steps.map((step, i) => ({
        number: String(i + 1).padStart(2, "0"),
        title: step.title,
        description: step.description,
      })),
    },
    talentPool: {
      eyebrow: page.talentPool.eyebrow,
      title: page.talentPool.title,
      body: page.talentPool.body,
      cta: linkView(s, page.talentPool.cta),
      call: linkView(s, page.talentPool.call),
    },
  }
}

/** The paragraphs of a paragraphs-only doc as plain strings. */
const paragraphsOf = (doc: PublicJob["content"]["about"]) =>
  doc.content
    .map((p) =>
      (p.content ?? []).map((n) => ("text" in n ? n.text : "\n")).join("")
    )
    .filter((text) => text.trim() !== "")

/** "/careers/<slug>": the job's own words around the shared copy. */
export function jobDetailView(
  s: SiteSources,
  job: PublicJob,
  all: PublicJob[],
  now: Date
): JobDetailView {
  const page = s.pages.careers.data
  const labels = page.job
  const c = job.content
  const hero = pageHeroView(s, page.hero)
  const applyHref = `${jobPath(job.slug)}/apply`
  const closing = c.closingDate ? closedOnDate(c.closingDate) : ""
  return {
    slug: job.slug,
    open: openNow(job, now),
    hero: {
      crumbs: {
        home: hero.home,
        careers: { label: hero.crumb, href: "/careers" },
        ariaLabel: hero.ariaLabel,
      },
      image: hero.image,
      nowHiring: labels.nowHiring,
      category: c.category,
      title: c.title,
      summary: c.summary,
      facts: {
        location: c.location,
        type: c.employmentType,
        hours: c.hoursShort,
        pay: c.pay,
      },
      applyNow: { label: labels.applyNow, href: applyHref },
      saveJob: labels.saveJob,
      savedJob: labels.savedJob,
      closedNotice: textView(s, labels.closedNotice),
    },
    body: {
      aboutTitle: labels.aboutTitle,
      about: paragraphsOf(c.about),
      responsibilitiesTitle: labels.responsibilitiesTitle,
      responsibilities: c.responsibilities,
      lookingForTitle: labels.lookingForTitle,
      essentialTitle: labels.essentialTitle,
      requiredPill: labels.requiredPill,
      essential: c.essential,
      desirableTitle: labels.desirableTitle,
      nicePill: labels.nicePill,
      desirable: c.desirable,
      offerTitle: labels.offerTitle,
      offerIntro: c.offerIntro,
      offers: c.offers,
      equalOpportunities: labels.equalOpportunities,
      checkIcon: s.settings.microcopy.checkIcon.url,
    },
    sidebar: {
      summaryTitle: labels.summaryTitle,
      rows: [
        {
          icon: "reference",
          label: labels.summaryLabels.reference,
          value: c.reference,
        },
        {
          icon: "location",
          label: labels.summaryLabels.location,
          value: c.location,
        },
        {
          icon: "type",
          label: labels.summaryLabels.type,
          value: c.employmentType,
        },
        { icon: "hours", label: labels.summaryLabels.hours, value: c.hours },
        { icon: "pay", label: labels.summaryLabels.pay, value: c.payDetail },
        {
          icon: "start",
          label: labels.summaryLabels.start,
          value: c.startDate,
        },
        ...(closing
          ? [
              {
                icon: "closing",
                label: labels.summaryLabels.closing,
                value: closing,
              },
            ]
          : []),
      ],
      apply: { label: labels.applyForJob, href: applyHref },
      share: labels.share,
      linkCopied: labels.linkCopied,
      questionsTitle: labels.questionsTitle,
      questionsBody: labels.questionsBody,
      phone: linkView(s, labels.phone),
      email: linkView(s, labels.email),
      beforeTitle: labels.beforeTitle,
      beforeIntro: labels.beforeIntro,
      beforeItems: labels.beforeItems,
    },
    similar: {
      eyebrow: labels.similarEyebrow,
      title: labels.similarTitle,
      viewAll: { label: labels.viewAll, href: "/careers#open-positions" },
      openPill: page.open.openPill,
      viewJob: page.open.viewJob,
      jobs: similarJobs(job, all, now).map((j) =>
        jobRow(s, j, now, page.open.postedLabel)
      ),
    },
  }
}
