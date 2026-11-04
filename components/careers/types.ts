// Props of the careers components, built by templates/careers/view.ts.
// Every string is the careers page copy or a job's own content.

import type { PageHeroProps } from "@/components/home/page-hero"

export type Link = { label: string; href: string }

export type JobRowView = {
  slug: string
  href: string
  title: string
  category: string
  location: string
  type: string
  hours: string
  pay: string
  /** "Posted 3 days ago" */
  posted: string
}

export type ClosedJobView = {
  slug: string
  title: string
  category: string
  location: string
  type: string
  hours: string
  pay: string
  /** "Closed on 12 Sep 2026" */
  closed: string
}

export type WhyJoinProps = {
  eyebrow: string
  title: string
  description: string
  cards: { title: string; description: string; icon: string }[]
}

export type OpenPositionsProps = {
  eyebrow: string
  title: string
  intro: string
  /** "5 open roles" */
  count: string
  searchPlaceholder: string
  allLocations: string
  allTypes: string
  openPill: string
  viewJob: string
  emptyText: string
  jobs: JobRowView[]
  filters: {
    /** "All Roles (5)" */
    allRoles: string
    categories: { name: string; count: number }[]
    locations: string[]
    types: string[]
  }
}

export type PreviousOpeningsProps = {
  eyebrow: string
  title: string
  intro: string
  closedPill: string
  filled: string
  jobs: ClosedJobView[]
}

export type HiringProcessProps = {
  eyebrow: string
  title: string
  intro: string
  steps: { number: string; title: string; description: string }[]
}

export type TalentPoolProps = {
  eyebrow: string
  title: string
  body: string
  cta: Link
  call: Link
}

export type CareersView = {
  hero: PageHeroProps
  why: WhyJoinProps
  open: OpenPositionsProps
  previous: PreviousOpeningsProps
  process: HiringProcessProps
  talentPool: TalentPoolProps
}
