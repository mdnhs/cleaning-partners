import { expect, type Page, test } from "@playwright/test"

import { clientIpFor } from "../e2e/fixtures"
import { visibleImagesLoaded } from "../e2e/media-pins"

import { VISUAL_ADMIN, VISUAL_AUTHOR, VISUAL_EDITOR } from "./admin-user"

// Baselines are macOS renders: CI runs E2E only.
test.skip(process.platform !== "darwin", "visual baselines are macOS-only")

// Admin screen baselines (R11-7): every admin screen in light and dark,
// desktop and phone. Relative times and the time-of-day greeting are masked;
// the dashboard's numbers and the activity log are pinned with page.route
// (real entries change with every sign-in); charts skip their grow-in under
// reduced motion.

test.use({ reducedMotion: "reduce" })

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(
      `visual ${testInfo.title} ${testInfo.project.name}`
    ),
  })
})

const DASHBOARD = {
  kpis: {
    leads30d: { value: 7, previous: 5 },
    openLeads: 3,
    published: { pages: 8, services: 5, articles: 7 },
    inReview: 2,
    seoScore: 92,
  },
  enquiriesWeek: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
      key: `2026-10-${String(12 + i).padStart(2, "0")}`,
      label,
      current: [0, 1, 0, 2, 1, 0, 3][i]!,
      previous: [1, 0, 2, 1, 0, 1, 0][i]!,
    })),
    current: 7,
    previous: 5,
    previousToDate: 4,
  },
  contentHealth: { complete: 14, needsWork: 5, missing: 3 },
  qa: [
    {
      rule: "legal-unpublished",
      label: "Terms of use",
      href: "/admin/pages/terms",
      message:
        "Still the starter text: have it reviewed, then publish your own.",
    },
  ],
  nextUp: [
    {
      id: "smtp",
      title: "Set up email (SMTP)",
      description: "So enquiries and invitations reach people.",
      href: "/admin/settings/integrations/smtp",
      done: false,
    },
    {
      id: "two-factor",
      title: "Turn on two-factor authentication",
      description: "Protect the owner and admin accounts.",
      href: "/admin/account?tab=security",
      done: true,
    },
  ],
}

const AUDIT = {
  items: ["page.published", "settings.draft_saved", "auth.sign_in"].map(
    (action, i) => ({
      id: `a${i}`,
      action,
      entityType: action.startsWith("page")
        ? "page"
        : action.startsWith("settings")
          ? "settings"
          : null,
      entityId: action.startsWith("page")
        ? "home"
        : action.startsWith("settings")
          ? "footer"
          : null,
      actor: { id: "u1", name: "Vera Visual", email: VISUAL_ADMIN.email },
      impersonatorId: null,
      ip: "198.18.0.1",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      diff:
        action === "settings.draft_saved"
          ? { from: { phone: "01 234 5678" }, to: { phone: "01 234 9999" } }
          : null,
      createdAt: "2026-10-16T09:00:00Z",
    })
  ),
  page: 1,
  pageSize: 6,
  total: 3,
}

/**
 * The review queue, pinned: the seed publishes every article, so two drafts
 * awaiting review are served for the ?status=in_review shot; the unfiltered
 * list and the options come from the seed.
 */
const REVIEW_QUEUE = {
  items: [
    "Preparing Your Office for a Deep Clean",
    "Choosing a Cleaning Partner for Your School",
  ].map((title, i) => ({
    id: `0190f0e0-0000-7000-8000-0000000000a${i}`,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title,
    live: false,
    category: { id: "c1", slug: "commercial", name: "Commercial" },
    author: { id: "u2", name: "Arthur Visual", title: "Cleaning writer" },
    scheduledAt: null,
    readTimeMinutes: null,
    createdAt: "2026-10-16T09:00:00Z",
    permissions: {
      update: true,
      delete: true,
      submit: false,
      publish: true,
      changeAuthor: true,
    },
    version: 2,
    status: "in_review",
    dirty: true,
    publishedAt: null,
    updatedAt: "2026-10-16T09:00:00Z",
    updatedBy: { id: "u2", name: "Arthur Visual" },
  })),
  page: 1,
  pageSize: 20,
  total: 2,
}

/** The dashboard's numbers and the activity log, pinned. */
async function pinData(page: Page) {
  await page.route("**/api/v1/admin/dashboard", (route) =>
    route.fulfill({ json: DASHBOARD })
  )
  await page.route("**/api/v1/admin/audit*", (route) =>
    route.fulfill({ json: AUDIT })
  )
}

async function signIn(
  page: Page,
  who: { email: string; password: string } = VISUAL_ADMIN
) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(who.email)
  await page.getByLabel("Password", { exact: true }).fill(who.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByTestId("greeting")).toBeVisible()
  // The sidebar's enquiry count is server-rendered from the database (not
  // pinnable with page.route): the visual seed has no enquiries, so it stays
  // hidden. A lead left by another spec would show it in every shot.
  await expect(page.getByLabel(/ new enquiries$/)).toHaveCount(0)
  // Same for the bell's red dot (unassigned leads, failed jobs, unreadable
  // Turnstile): the visual seed has none of them.
  await expect(page.locator('[data-slot="notification-dot"]')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}

/**
 * A mask covers the masked element's box, and the box follows the text: a
 * relative time, the time-of-day greeting, the host and a session's sign-in
 * line all change length from run to run. They are boxed to a fixed width
 * first, so the mask is the same size every time.
 */
const STABLE_CSS = `
  time, [data-testid="greeting"], [data-slot="website-host"],
  [aria-label="Signed-in devices"] li > div > span:last-child {
    display: inline-block; max-width: 100%; overflow: hidden;
    white-space: nowrap; vertical-align: bottom;
  }
  time { width: 9rem }
  [data-testid="greeting"] { width: 20rem }
  [data-slot="website-host"] { width: 12rem }
  [aria-label="Signed-in devices"] li > div > span:last-child { width: 18rem }
`

/**
 * Every image in view has loaded and decoded (the sidebar logo is scaled
 * down from a large file: a half-decoded frame differs by a few pixels).
 */
async function imagesSettled(page: Page) {
  await expect.poll(() => visibleImagesLoaded(page)).toBe(true)
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
  )
}

async function masks(page: Page) {
  await imagesSettled(page)
  await page.addStyleTag({ content: STABLE_CSS })
  return [
    page.locator("time"),
    page.getByTestId("greeting"),
    page.locator('[data-slot="website-host"]'),
    page
      .getByRole("list", { name: "Signed-in devices" })
      .locator("li > div > span:last-child"),
  ]
}

/**
 * Overlays (sheets, the palette): the page behind is hidden with CSS, as a
 * mask painted at a masked element's position would show through the
 * overlay; only the sidebar's host line still needs masking.
 */
async function overlayOnly(page: Page) {
  await imagesSettled(page)
  await page.addStyleTag({
    content: `${STABLE_CSS} main#main { visibility: hidden }`,
  })
  return [page.locator('[data-slot="website-host"]')]
}

/** The editor has loaded and settled (autosave idle). */
async function editorReady(page: Page, title: string) {
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible()
  await expect(page.getByRole("status", { name: /^Save status/ })).toHaveText(
    /Saved/
  )
  await page.evaluate(() => document.fonts.ready)
}

/** Pinned dates and rights for the article editor shots. */
const ARTICLE_TIMES = {
  createdAt: "2026-10-12T09:00:00.000Z",
  updatedAt: "2026-10-16T09:00:00.000Z",
}
const AUTHOR_RIGHTS = {
  update: true,
  delete: true,
  submit: true,
  publish: false,
  changeAuthor: false,
}
const EDITOR_RIGHTS = {
  update: true,
  delete: true,
  submit: true,
  publish: true,
  changeAuthor: true,
}

/**
 * Opens a seeded article in the editor with its state pinned: the API's
 * record (seeded content, real cover image) with the workflow fields
 * replaced, so the shot shows a draft / review / schedule whatever the seed
 * published, and the dates never change.
 */
async function openArticle(
  page: Page,
  slug: string,
  state: Record<string, unknown>
) {
  const list = await page.request.get(
    `/api/v1/admin/articles?q=${encodeURIComponent(slug)}`
  )
  const { items } = (await list.json()) as {
    items: { id: string; slug: string; title: string }[]
  }
  const article = items.find((a) => a.slug === slug)!
  await page.route(`**/api/v1/admin/articles/${article.id}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue()
    const response = await route.fetch()
    const record = (await response.json()) as Record<string, unknown>
    await route.fulfill({
      json: { ...record, ...ARTICLE_TIMES, ...state },
    })
  })
  await page.goto(`/admin/blog/${article.id}`)
  return article
}

/** The article editor has loaded (read-only ones have no save state). */
async function articleReady(page: Page, title: string) {
  await editorReady(page, title)
  await expect(page.getByLabel("Category", { exact: true })).toBeVisible()
  // The cover thumbnail and the word count have rendered.
  await expect(
    page.getByText(/words · about \d+ min read|No text yet/)
  ).toBeVisible()
}

const OFFICE = "5-signs-your-office-needs-a-professional-clean"
const OFFICE_TITLE = "5 Signs Your Office Needs a Professional Clean"
const FEATURED = "deep-cleaning-vs-regular-cleaning-what-your-business-needs"
const FEATURED_TITLE =
  "Deep Cleaning vs Regular Cleaning: What Your Business Needs"

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    const shot = (name: string) => `admin-${name}-${colorScheme}.png`

    test(`admin dashboard ${colorScheme}`, async ({ page }) => {
      await pinData(page)
      await signIn(page)
      await expect(
        page.getByRole("region", { name: "Team activity", exact: true })
      ).toContainText("published the home page")
      await expect(page).toHaveScreenshot(shot("dashboard"), {
        mask: await masks(page),
      })
    })

    test(`admin pages list ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/pages")
      await expect(
        page.getByRole("heading", { level: 1, name: "Pages" })
      ).toBeVisible()
      // The seed's custom (builder) rows are listed beside the fixed pages.
      await expect(
        page
          .getByRole("main")
          .getByRole("link", { name: "Visual fixture", exact: true })
          .first()
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("pages"), {
        mask: await masks(page),
      })
    })

    test(`admin page editor ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/pages/home")
      await editorReady(page, "Home")
      await expect(page).toHaveScreenshot(shot("page-editor"), {
        mask: await masks(page),
      })
    })

    // The page builder on the seeded /p/visual-fixture. The preview pane (a
    // live iframe of the public page) is masked.
    test(`admin page builder ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/pages")
      await page
        .getByRole("main")
        .getByRole("link", { name: "Visual fixture", exact: true })
        .first()
        .click()
      await editorReady(page, "Visual fixture")
      await expect(
        page.getByRole("navigation", { name: "Page outline" })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("page-builder"), {
        mask: [...(await masks(page)), page.locator("iframe")],
      })
    })

    test(`admin services list ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/services")
      await expect(
        page.getByRole("heading", { level: 1, name: "Services" })
      ).toBeVisible()
      await expect(
        page.getByRole("link", { name: "Medical Cleaning" }).first()
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("services"), {
        mask: await masks(page),
      })
    })

    test(`admin service editor ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/services")
      await page.getByRole("link", { name: "Medical Cleaning" }).first().click()
      await editorReady(page, "Medical Cleaning")
      await expect(page).toHaveScreenshot(shot("service-editor"), {
        mask: await masks(page),
      })
    })

    test(`admin articles list ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/blog")
      await expect(
        page.getByRole("heading", { level: 1, name: "Blog" })
      ).toBeVisible()
      await expect(
        page
          .getByRole("main")
          .getByRole("link", { name: /^Deep Cleaning vs Regular Cleaning/ })
          .first()
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("articles"), {
        mask: await masks(page),
      })
    })

    test(`admin review queue ${colorScheme}`, async ({ page }) => {
      await page.route("**/api/v1/admin/articles?*status=in_review*", (route) =>
        route.fulfill({ json: REVIEW_QUEUE })
      )
      await signIn(page)
      await page.goto("/admin/blog?status=in_review")
      await expect(
        page.getByRole("button", { name: "Review queue" })
      ).toHaveAttribute("aria-pressed", "true")
      await expect(
        page
          .getByRole("main")
          .getByRole("link", { name: "Preparing Your Office for a Deep Clean" })
          .first()
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("review-queue"), {
        mask: await masks(page),
      })
    })

    test(`admin new article ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/blog/new")
      await expect(
        page.getByRole("heading", { level: 1, name: "New article" })
      ).toBeVisible()
      // A shadcn Select shows only its value, not the option list: the
      // Byline default proves the options query (categories too) has loaded.
      await expect(page.getByLabel("Byline")).toContainText("Vera Visual")
      await expect(page.getByLabel("Category", { exact: true })).toContainText(
        "Choose…"
      )
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("new-article"), {
        mask: await masks(page),
      })
    })

    test(`admin article editor as author ${colorScheme}`, async ({ page }) => {
      await signIn(page, VISUAL_AUTHOR)
      await openArticle(page, OFFICE, {
        live: false,
        status: "draft",
        published: null,
        dirty: true,
        publishedAt: null,
        scheduledAt: null,
        readTimeMinutes: null,
        permissions: AUTHOR_RIGHTS,
        author: { id: "author", name: VISUAL_AUTHOR.name, title: null },
        updatedBy: { id: "author", name: VISUAL_AUTHOR.name },
      })
      await articleReady(page, OFFICE_TITLE)
      await expect(
        page.getByRole("button", { name: "Submit for review" })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("article-author"), {
        mask: await masks(page),
      })
    })

    test(`admin article in review ${colorScheme}`, async ({ page }) => {
      await signIn(page, VISUAL_EDITOR)
      await openArticle(page, OFFICE, {
        live: false,
        status: "in_review",
        published: null,
        dirty: true,
        publishedAt: null,
        scheduledAt: null,
        readTimeMinutes: null,
        permissions: EDITOR_RIGHTS,
        updatedBy: { id: "author", name: VISUAL_AUTHOR.name },
      })
      await articleReady(page, OFFICE_TITLE)
      await expect(
        page.getByRole("button", { name: "Publish", exact: true })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("article-review"), {
        mask: await masks(page),
      })
    })

    for (const dialog of [false, true])
      test(`admin article scheduled${dialog ? " + schedule dialog" : ""} ${colorScheme}`, async ({
        page,
      }) => {
        await signIn(page, VISUAL_EDITOR)
        await openArticle(page, OFFICE, {
          live: false,
          status: "scheduled",
          published: null,
          dirty: true,
          publishedAt: null,
          scheduledAt: "2099-11-02T09:30:00.000Z",
          readTimeMinutes: null,
          permissions: EDITOR_RIGHTS,
        })
        await articleReady(page, OFFICE_TITLE)
        await expect(
          page.getByRole("button", { name: "Cancel schedule" })
        ).toBeVisible()
        if (!dialog) {
          await expect(page).toHaveScreenshot(shot("article-scheduled"), {
            mask: await masks(page),
          })
          return
        }
        await page.getByRole("button", { name: "Reschedule" }).click()
        const schedule = page.getByRole("dialog", {
          name: "Schedule publishing",
        })
        await expect(schedule.getByLabel("Publish on")).toHaveValue(
          "2099-11-02T09:30"
        )
        await expect(page).toHaveScreenshot(shot("article-schedule-dialog"), {
          mask: await overlayOnly(page),
        })
      })

    test(`admin featured article settings ${colorScheme}`, async ({ page }) => {
      // The live, featured article: the panel says why it cannot be
      // unpublished, deleted or moved.
      await signIn(page, VISUAL_EDITOR)
      // The seed features no article (pages.blog.featuredArticle is null):
      // the options response names this one, as the blog page would.
      await page.route("**/api/v1/admin/articles/options", async (route) => {
        const options = (await (await route.fetch()).json()) as object
        await route.fulfill({ json: { ...options, featured: [FEATURED] } })
      })
      await openArticle(page, FEATURED, {
        publishedAt: "2026-09-28T09:00:00.000Z",
        permissions: EDITOR_RIGHTS,
      })
      await articleReady(page, FEATURED_TITLE)
      await expect(
        page.getByText(/The blog page features this article\./)
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("article-featured"), {
        mask: await masks(page),
      })
    })

    test(`admin team collection ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/collections/team")
      await expect(
        page.getByRole("navigation", { name: "Collections" })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Edit Michael McDonald" }).first()
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("team"), {
        mask: await masks(page),
      })
      // The record sheet (edit one team member).
      await page
        .getByRole("button", { name: "Edit Michael McDonald" })
        .first()
        .click()
      const sheet = page.getByRole("dialog", { name: "Team member" })
      await expect(sheet).toBeVisible()
      await expect(sheet.getByLabel("Name", { exact: true })).toHaveValue(
        "Michael McDonald"
      )
      await expect(page).toHaveScreenshot(shot("team-record-sheet"), {
        mask: await overlayOnly(page),
      })
    })

    test(`admin testimonials collection ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/collections/testimonials")
      await expect(
        page.getByRole("navigation", { name: "Collections" })
      ).toBeVisible()
      const edit = page.getByRole("button", { name: /^Edit / }).first()
      await expect(edit).toBeVisible()
      await expect(page).toHaveScreenshot(shot("testimonials"), {
        mask: await masks(page),
      })
      await edit.click()
      await expect(
        page.getByRole("dialog", { name: "Testimonial" })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("testimonials-record-sheet"), {
        mask: await overlayOnly(page),
      })
    })

    test(`admin site settings ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/settings/site")
      await expect(
        page.getByRole("navigation", { name: "Site settings" })
      ).toBeVisible()
      await editorReady(page, "Identity")
      await expect(page).toHaveScreenshot(shot("settings-site"), {
        mask: await masks(page),
      })
    })

    test(`admin contact settings with the live preview ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "the live preview pane exists from 1536 px up"
      )
      await page.setViewportSize({ width: 1600, height: 900 })
      await signIn(page)
      await page.goto("/admin/settings/contact")
      await editorReady(page, "Contact details")
      await page.getByRole("switch", { name: "Live preview" }).click()
      const pane = page.getByRole("region", { name: "Live preview" })
      await expect(pane).toBeVisible()
      await expect(pane.locator('iframe[title="Page preview"]')).toBeVisible()
      await expect(pane.getByLabel("Refreshing")).toHaveCount(0)
      // The frame shows the public site (pinned by its own baselines).
      await expect(page).toHaveScreenshot(shot("settings-contact-preview"), {
        mask: [
          ...(await masks(page)),
          pane.locator('iframe[title="Page preview"]'),
        ],
      })
    })

    for (const tab of [
      { id: "profile", label: "Profile" },
      { id: "security", label: "Security" },
      // The snapshot keeps its "sessions" name; the URL is ?tab=devices.
      { id: "sessions", param: "devices", label: "Devices" },
    ] as { id: string; param?: string; label: string }[]) {
      test(`admin account ${tab.id} ${colorScheme}`, async ({ page }) => {
        await signIn(page)
        await page.goto(`/admin/account?tab=${tab.param ?? tab.id}`)
        const tabs = page.getByRole("tablist", { name: "Account sections" })
        await expect(
          tabs.getByRole("tab", { name: tab.label })
        ).toHaveAttribute("aria-selected", "true")
        if (tab.id === "sessions") {
          // Every screenshot test signs in afresh: keep only this session,
          // so the list has one row whatever ran before.
          const devices = page.getByRole("list", { name: "Signed-in devices" })
          await expect(devices).toBeVisible()
          const others = page.getByRole("button", {
            name: "Sign out all other devices",
          })
          if (await others.isVisible()) {
            await others.click()
            await expect(others).toHaveCount(0)
          }
          await expect(devices.getByRole("listitem")).toHaveCount(1)
        }
        await page.evaluate(() => document.fonts.ready)
        await expect(page).toHaveScreenshot(shot(`account-${tab.id}`), {
          mask: await masks(page),
        })
      })
    }

    test(`admin users list ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/users")
      // A table from 640 px, cards below: find the links in either.
      const main = page.getByRole("main")
      await expect(
        main.getByRole("link", { name: VISUAL_ADMIN.name, exact: true })
      ).toBeVisible()
      await expect(
        main.getByRole("link", { name: VISUAL_EDITOR.name, exact: true })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("users"), {
        mask: await masks(page),
      })
    })

    test(`admin user detail ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/users")
      await page
        .getByRole("main")
        .getByRole("link", { name: VISUAL_EDITOR.name, exact: true })
        .click()
      await expect(
        page.getByRole("heading", { level: 1, name: VISUAL_EDITOR.name })
      ).toBeVisible()
      await expect(
        page.getByRole("tablist", { name: "User sections" })
      ).toBeVisible()
      // The click on the list row leaves the pointer over the tab rail:
      // park it, so no hover state depends on the list's row count.
      await page.mouse.move(0, 0)
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("user-detail"), {
        mask: await masks(page),
      })
    })

    test(`admin activity log ${colorScheme}`, async ({ page }) => {
      await pinData(page)
      await signIn(page)
      await page.goto("/admin/activity")
      await expect(
        page.getByRole("heading", { level: 1, name: "Activity log" })
      ).toBeVisible()
      // Three pinned entries, as table rows or as cards.
      await expect(
        page.getByRole("button", { name: /^Details of/ })
      ).toHaveCount(3)
      await expect(page).toHaveScreenshot(shot("audit"), {
        mask: await masks(page),
      })
      // The detail sheet with a before/after diff.
      await page
        .getByRole("button", { name: /^Details of settings\.draft_saved/ })
        .click()
      const sheet = page.getByRole("dialog", { name: "Activity entry" })
      await expect(sheet.getByLabel("After", { exact: true })).toContainText(
        "01 234 9999"
      )
      await expect(page).toHaveScreenshot(shot("audit-detail-sheet"), {
        mask: await overlayOnly(page),
      })
    })

    test(`admin impersonation banner ${colorScheme}`, async ({ page }) => {
      await pinData(page)
      await signIn(page)
      await page.goto("/admin/users")
      await page
        .getByRole("main")
        .getByRole("link", { name: VISUAL_EDITOR.name, exact: true })
        .click()
      await page.getByRole("button", { name: "View as" }).click()
      await page
        .getByRole("alertdialog", {
          name: `View the admin as ${VISUAL_EDITOR.name}?`,
        })
        .getByRole("button", { name: "Start viewing" })
        .click()
      const banner = page.getByRole("region", { name: "Impersonation" })
      await expect(banner).toContainText(
        `You are viewing the admin as ${VISUAL_EDITOR.name}`
      )
      await expect(page.getByTestId("greeting")).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Key figures" })
      ).toBeAttached()
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("impersonation"), {
        mask: await masks(page),
      })
    })

    test(`admin command palette ${colorScheme}`, async ({ page }) => {
      await pinData(page)
      await signIn(page)
      await page.getByRole("button", { name: "Search" }).click()
      const dialog = page.getByRole("dialog", { name: "Search the admin" })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole("option").first()).toBeVisible()
      await expect(page).toHaveScreenshot(shot("command-palette"), {
        mask: await overlayOnly(page),
      })
    })

    test(`admin navigation sheet ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "mobile",
        "the sheet exists below lg only"
      )
      await pinData(page)
      await signIn(page)
      await page.getByRole("button", { name: "Toggle navigation" }).click()
      await expect(
        page.getByRole("dialog", { name: "Navigation" })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(shot("nav-sheet"), {
        mask: await overlayOnly(page),
      })
    })

    test(`admin forbidden ${colorScheme}`, async ({ page }) => {
      // An editor holds no user:read: /admin/users is the 403 state.
      await signIn(page, VISUAL_EDITOR)
      await page.goto("/admin/users")
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "You do not have access to this page",
        })
      ).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("forbidden"), {
        mask: await masks(page),
      })
    })

    test(`admin not found ${colorScheme}`, async ({ page }) => {
      await signIn(page)
      await page.goto("/admin/this-page-does-not-exist")
      await expect(
        page.getByRole("heading", { level: 1, name: "That page doesn't exist" })
      ).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("not-found"), {
        mask: await masks(page),
      })
    })

    test(`admin sign-in ${colorScheme}`, async ({ page }) => {
      await page.goto("/admin/sign-in")
      await expect(
        page.getByRole("heading", { level: 1, name: "Sign in" })
      ).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(shot("sign-in"))
    })
  })
}
