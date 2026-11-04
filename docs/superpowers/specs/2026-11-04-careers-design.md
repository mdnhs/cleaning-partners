# Careers — design

## Why

Cleaning Partners hires cleaners all year across Laois, Offaly, Kildare and
Westmeath. The owner wants a Careers section on the public site, built from
the Figma designs, that the office runs entirely from the admin panel:
posting and closing jobs, editing every word on the pages, and receiving
applications (with CVs) without a developer.

The owner asked for no questions: this design follows how the rest of the
platform already works (services, articles, legal pages, the quote form and
the Enquiries inbox). Every call below that the owner did not make is
marked **(my call)**.

## Figma (source of the layout and the starter copy)

File `rqn6YCXhXaGzxNGfMDkuxc` (Cleaning Partners - Home Page), read through
the local Figma MCP:

| Node | Page | Route |
|------|------|-------|
| 496:16 | Careers (list) | `/careers` |
| 497:285 | Job detail | `/careers/<slug>` |
| 498:285 | Application form | `/careers/<slug>/apply` |

The Figma copy is the seed content. The design uses the site's existing
header, footer, page hero (breadcrumb, title, intro over the default hero
photo), section headings, cards and buttons: those components are reused,
not redrawn.

### Careers (`/careers`)
1. Page hero: crumb "Careers", title "Careers", intro "Join the Clean Team — …".
2. "Why Work With The Clean Team": eyebrow, title, intro, four icon cards
   (Paid Training, Weekly Pay, Uniform & Equipment, Room to Grow).
3. "Open Positions": eyebrow "NOW HIRING", title, intro, an "N open roles"
   count, a search box, Location and Job Type selects, category chips
   ("All Roles (5)", Healthcare, Commercial, Domestic, Supervisory,
   Specialist), then one row per open job: category pill + "Open" pill,
   title, location, type, hours, pay, "Posted 3 days ago", "View Job".
4. "Previous Openings": eyebrow "CLOSED ROLES", rows for closed jobs with
   a "Closed" pill, "Closed on 12 Sep 2026" and "Position Filled".
5. "Our Hiring Process": four numbered steps.
6. Talent-pool banner (navy): "Don’t see the right role?", "Send Us Your CV",
   "Call (085) 806 2369".

### Job detail (`/careers/<slug>`)
1. Hero: breadcrumb Home / Careers / <title>, "Now Hiring" + category pills,
   title, summary, four facts (location, type, hours, pay), "Apply Now",
   "Save Job".
2. Main column: About the Role (paragraphs), Key Responsibilities (ticked
   list), What We’re Looking For (Essential/Required and Desirable/Nice to
   have cards), What We Offer (intro + icon tiles), equal-opportunities note.
3. Sidebar: Job Summary card (reference, location, type, hours, pay, start
   date, closing date, "Apply for This Job", "Share this job"), "Questions
   about this role?" navy card (phone, email), "Before You Apply" checklist.
4. "Similar Roles": up to three other open jobs, "View All Jobs".

### Application (`/careers/<slug>/apply`, and `/careers/apply` for the talent pool)
Six numbered sections: Personal Details; Eligibility & Vetting (right to
work, permission expiry date, lived abroad 6+ months); Availability (start
date, hours per week, shifts, driving/transport); Experience & Training
(years, healthcare experience, most recent role, certificates); CV & Cover
Note (optional CV upload PDF/DOC/DOCX up to 5 MB, note, how you heard);
Declaration & Consent (declaration, privacy consent, keep-on-file for 12
months). Sidebar: "You’re applying for" card, What Happens Next, Your Data
Is Safe, Need Help Applying.

## Goals

- `/careers`, `/careers/<slug>`, `/careers/<slug>/apply`, `/careers/apply`
  match the Figma designs, responsive, with the site's scroll motion.
- Admin › Careers › Jobs: create, edit (draft → publish like services),
  close/reopen, delete, reorder; each job has its own address and SEO.
- Admin › Pages › Careers: every word on the three pages (headings, cards,
  steps, labels, form questions and their options, consent texts) is
  editable, as the other fixed pages are.
- Admin › Careers › Applications: an inbox of applications with status,
  notes, the CV download, delete and CSV export; a staff email on each new
  application.
- Header and footer link to Careers.
- Jobs appear in the sitemap and carry schema.org JobPosting data.

## Non-goals

- No applicant accounts, no saved drafts of an application, no multi-step
  wizard: one page, one submit.
- No ATS features (interview scheduling, scoring, email templates to
  candidates beyond an acknowledgement).
- No job alerts or newsletter.
- No per-job custom form questions: one form for every job, edited on the
  Careers page.

## Anti-goals (a failure even if it works)

- A CV reachable by anyone but a signed-in user with enquiry access (CVs
  never go through the public media route).
- Hard-coded copy in public components (the project's public-literals test
  forbids it).
- An application lost silently: if the email fails, the application is still
  stored and visible in the inbox.
- Applications kept forever: they are purged after the retention period.
- A closed job that still accepts applications.

## Decisions

### Content model
- **Jobs** are a new versioned collection, like services: `jobs` table with
  `slug` (unique, `a-z0-9-`), `sort_order`, `seo`, `closed_at` (null = not
  closed by hand) and the shared versioning columns (draft/published,
  version, status, published_at). **(my call)**
- Job content (draft/published payload): `title`, `reference`, `category`,
  `location`, `employmentType` (display, e.g. "Part-time, Permanent"),
  `schemaEmploymentType` (FULL_TIME | PART_TIME | TEMPORARY | CONTRACTOR, for
  JobPosting), `hoursShort` ("25 hrs/week, Mon–Fri"), `hours` ("25 hrs/week,
  Mon–Fri 6am–11am"), `pay` ("€14.50–€15.50/hr"), `payDetail` ("€14.50–€15.50
  per hour"), `startDate` (text, "Immediate start"), `closingDate` (ISO date
  or null), `summary`, `about` (paragraphs), `responsibilities[]`,
  `essential[]`, `desirable[]`, `offerIntro`, `offers[{ icon, text }]` where
  icon is one of a fixed set (pay, training, uniform, roster, leave, career).
  **(my call)**
- A job is **open** when it is published, `closed_at` is null and its
  `closingDate` is null or today or later (Europe/Dublin). A published job
  that is not open is listed under Previous Openings with "Closed on <date>"
  (`closed_at`, else the closing date). Drafts appear nowhere. **(my call)**
- "Posted N days ago" counts from the job's first publish (`published_at`).
- **Categories, locations and job types are not separate lists**: the chips
  and selects are built from the open jobs' own values. **(my call)**
- **Careers page copy** is a new fixed page `careers` in the template
  registry (edited in Admin › Pages like Home/About), holding the hero, the
  section copy, the shared job-detail labels and sidebar copy, and the whole
  application form copy: labels, placeholders, help texts, option lists for
  the selects and checkboxes, consent texts, sidebar texts and the success
  message. Option lists are editable lists of strings. **(my call)**

### Applications
- New `job_applications` table: job id (null for the talent pool, set null
  when the job is deleted), job title and reference snapshots, personal
  details, eligibility, availability, experience, note, heard-about, the
  three consent booleans, CV file (storage key, original name, mime, size;
  nullable), status (new, reviewing, shortlisted, interview, hired,
  rejected, spam), assignee, ip hash, source page, timestamps; plus
  `job_application_events` for status changes and notes (as `lead_events`).
  **(my call)**
- The form posts multipart to `POST /api/v1/public/applications`, with the
  quote form's protections: rate limit (5 per 10 minutes per IP), Turnstile
  when configured, a hidden honeypot field, server-side validation of every
  field and option against the published Careers page copy.
- CV: optional; PDF, DOC or DOCX by sniffed bytes; at most 5 MB; stored with
  the configured storage driver under a private key prefix
  `private/applications/YYYY/MM/<uuid>.<ext>` with no media row, so the public
  file route never serves it. Admins download it from
  `GET /api/v1/admin/applications/:id/cv` as an attachment, no-store.
- Permissions: applications reuse the `lead` resource (read, update, delete,
  export), so whoever handles Enquiries handles applications. Jobs get a new
  `job` resource (read, create, update, publish, delete) granted to the same
  roles as `service`. **(my call)**
- Email: a staff notification to Settings › Careers recipients (falling back
  to Settings › Leads recipients when empty) and an acknowledgement to the
  applicant, through the existing mailer. Sending failures are logged on the
  application's events, never lost. **(my call)**
- Retention: a daily job deletes applications (and their CV files) older
  than Settings › Careers `retentionMonths` (default 12). **(my call)**
- Submitting to a job that is not open answers 409 and the page says the
  role has closed.

### Public pages
- `/careers` filters on the client (search over title, location, category;
  location; job type; category chip); the page is server-rendered with all
  open jobs so it works without script.
- "Save Job" keeps the job in the visitor's browser (local storage) and
  shows a saved state; "Share this job" uses the device share sheet, else
  copies the link. **(my call)**
- Similar Roles: up to three other open jobs, same category first, then the
  most recent.
- The apply page for a closed job shows the closed notice and a link back
  to open roles instead of the form.
- After a successful submit the form is replaced by the success message
  from the Careers copy.
- Detail pages emit JobPosting JSON-LD (title, description from summary +
  about, datePosted, validThrough from closingDate, employmentType, hiring
  organization, job location locality from `location`, base salary only
  when it can be read as a number range in EUR). **(my call)**
- Navigation: a "Careers" link is added to Settings › Navigation (seed, and
  a data migration that appends it to an existing site's links when no link
  to /careers exists). **(my call)**

## Constraints (from the codebase)

- Next.js 16 with Cache Components; read `node_modules/next/dist/docs/`
  before writing routes. Public reads are `"use cache"` + tags; writes
  invalidate tags; previews read drafts.
- No hard-coded user-visible copy in `components/home|about|services|blog|
  contact`, `templates`, `components/consent` or any new public component
  directory (tests/unit/public-literals.test.ts); add the new public
  component directory to that test's list.
- Admin forms are SchemaForm driven by editor meta; versioned entities use
  VersionedEditor, VersionedStore, revisions, media usages, preview,
  redirects on slug change (like services: `/careers/<old>` → 301).
- Public request bodies are limited to 64 KB; the applications endpoint
  needs its own limit (5 MB + envelope).
- Frozen-component hashes (tests/unit/blocks/frozen-components.json) are
  re-baselined when a public section component changes.

## Left to the builder

- Exact Tailwind values: take them from the Figma design context (colours
  map to the existing tokens: brand #11b1d1, navy #28648f, navy-dark, line,
  surface, ink, body).
- Icons for the four "why" cards and the offer tiles: lucide equivalents of
  the Figma icons.
- Scroll motion: reuse HomeMotion's existing hooks (data-reveal,
  data-split, data-stagger, cards) rather than new animations.
