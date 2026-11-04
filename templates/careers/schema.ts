import { z } from "zod"

import { iconCard, link, pageHeroText, text } from "@/lib/schemas/common"

/** Optional copy (help texts, placeholders): may be left empty. */
const hint = z.string().max(500)
/** One form field's words. */
const field = z.object({ label: text, placeholder: hint, help: hint })
/** An editable list of choices (select options, checkboxes). */
const choices = z.array(text).min(1).max(20)
const step = z.object({ title: text, description: text })

/**
 * Page "careers" (/careers, every /careers/<slug> and its application form):
 * all the words of the three Figma pages. Jobs themselves are a collection
 * (lib/schemas/content/job.ts). {count}, {ago}, {date}, {title},
 * {location} and {reference} are filled in at render.
 */
export const careersTemplate = z.object({
  hero: pageHeroText,
  why: z.object({
    eyebrow: text,
    title: text,
    description: text,
    cards: z.array(iconCard).min(1).max(8),
  }),
  open: z.object({
    eyebrow: text,
    title: text,
    intro: text,
    /** "{count} open roles" */
    countLabel: text,
    searchPlaceholder: text,
    allLocations: text,
    allTypes: text,
    /** "All Roles ({count})" */
    allRoles: text,
    openPill: text,
    /** "Posted {ago}" */
    postedLabel: text,
    viewJob: text,
    emptyText: text,
  }),
  previous: z.object({
    eyebrow: text,
    title: text,
    intro: text,
    closedPill: text,
    /** "Closed on {date}" */
    closedOn: text,
    filled: text,
  }),
  process: z.object({
    eyebrow: text,
    title: text,
    intro: text,
    steps: z.array(step).min(2).max(6),
  }),
  talentPool: z.object({
    eyebrow: text,
    title: text,
    body: text,
    cta: link,
    call: link,
  }),
  job: z.object({
    nowHiring: text,
    applyNow: text,
    saveJob: text,
    savedJob: text,
    aboutTitle: text,
    responsibilitiesTitle: text,
    lookingForTitle: text,
    essentialTitle: text,
    requiredPill: text,
    desirableTitle: text,
    nicePill: text,
    offerTitle: text,
    equalOpportunities: text,
    summaryTitle: text,
    summaryLabels: z.object({
      reference: text,
      location: text,
      type: text,
      hours: text,
      pay: text,
      start: text,
      closing: text,
    }),
    applyForJob: text,
    share: text,
    linkCopied: text,
    questionsTitle: text,
    questionsBody: text,
    phone: link,
    email: link,
    beforeTitle: text,
    beforeIntro: text,
    beforeItems: z.array(text).min(1).max(10),
    similarEyebrow: text,
    similarTitle: text,
    viewAll: text,
    /** Shown instead of the apply buttons and the form once a job has closed. */
    closedNotice: text,
  }),
  apply: z.object({
    /** Last breadcrumb on a job's form ("Apply"). */
    crumb: text,
    title: text,
    talentPoolTitle: text,
    /** "{title} · {location} · Ref {reference}" */
    subtitle: text,
    talentPoolSubtitle: text,
    back: text,
    formTitle: text,
    formIntro: text,
    sections: z.object({
      personal: step,
      eligibility: step,
      availability: step,
      experience: step,
      cv: step,
      consent: step,
    }),
    fields: z.object({
      firstName: field,
      surname: field,
      email: field,
      phone: field,
      address: field,
      town: field,
      eircode: field,
      rightToWork: field,
      permissionExpiry: field,
      gardaVetting: field,
      livedAbroad: field,
      startDate: field,
      hoursPerWeek: field,
      shifts: field,
      transport: field,
      experience: field,
      healthcareExperience: field,
      recentRole: field,
      certificates: field,
      cv: field,
      note: field,
      heardAbout: field,
    }),
    options: z.object({
      rightToWork: choices,
      hours: choices,
      years: choices,
      healthcare: choices,
      shifts: choices,
      certificates: choices,
      heardAbout: choices,
    }),
    yes: text,
    no: text,
    required: text,
    selectPlaceholder: text,
    cvDrop: text,
    cvBrowse: text,
    cvHelp: text,
    declaration: text,
    privacy: text,
    keepOnFile: text,
    equalOpportunities: text,
    submit: text,
    sending: text,
    privacyNote: text,
    success: z.object({ title: text, body: text }),
    errors: z.object({
      required: text,
      invalidEmail: text,
      cvType: text,
      cvSize: text,
      closed: text,
      rateLimited: text,
      generic: text,
    }),
    sidebar: z.object({
      applyingFor: text,
      viewJob: text,
      nextTitle: text,
      nextSteps: z.array(step).min(1).max(6),
      dataTitle: text,
      dataBody: text,
      helpTitle: text,
      phone: link,
      email: link,
    }),
  }),
})
export type CareersTemplate = z.infer<typeof careersTemplate>
