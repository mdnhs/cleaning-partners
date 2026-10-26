import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// R11-8: each launch-critical flow → the e2e test that proves it. If a spec
// retitles a test, update the title here to the real one (never drop a row).
const LAUNCH_FLOWS = [
  {
    item: "sign-in per role",
    file: "roles.spec.ts",
    title: "signs in and sees exactly its menu",
  },
  {
    item: "invite → set password",
    file: "admin-auth.spec.ts",
    title: "set-password flow works with an invite token",
  },
  {
    item: "reset",
    file: "password-reset.spec.ts",
    title: "forgot password → reset link → new password → sign in",
  },
  { item: "2FA on", file: "account.spec.ts", title: "turn on 2FA" },
  { item: "2FA off", file: "account.spec.ts", title: "turn 2FA off" },
  {
    item: "edit + publish page → visible on site",
    file: "page-editor.spec.ts",
    title: "edit hero heading → autosave → preview → publish → public site",
  },
  {
    item: "author cannot publish",
    file: "articles.spec.ts",
    title: "author drafts and submits, cannot publish via the API",
  },
  {
    item: "author vs others' articles via the API",
    file: "roles.spec.ts",
    title: "the API refuses publishing and editing someone else's article",
  },
  {
    item: "intake sees only leads",
    file: "roles.spec.ts",
    title: "signs in and sees exactly its menu",
  },
  {
    item: "quote form → lead",
    file: "leads.spec.ts",
    title: "public enquiry → lead in the intake inbox",
  },
  {
    item: "media upload",
    file: "media.spec.ts",
    title:
      "library upload → hero image in the page editor → publish → public home",
  },
  {
    item: "redirect works",
    file: "seo-admin.spec.ts",
    title: "owner adds a redirect in SEO › Redirects; the old address 301s",
  },
  {
    item: "builder create → publish → view",
    file: "builder.spec.ts",
    title: "an editor builds, publishes and views a page",
  },
  {
    item: "consent banner",
    file: "consent.spec.ts",
    title: "tracking on: the banner gates GTM, GA4 and the Meta pixel",
  },
  {
    item: "AI setup",
    file: "ai-setup.spec.ts",
    title: "the owner sees the sparkle button and reaches the AI settings",
  },
  {
    item: "auth endpoints rate limited",
    file: "admin-auth.spec.ts",
    title: "sign-in is rate limited in production",
  },
  {
    item: "security headers",
    file: "security-headers.spec.ts",
    title: "sends the hardening headers",
  },
  {
    item: "animated logo",
    file: "lottie-logo.spec.ts",
    title: "animated logo plays in the public header and footer",
  },
] as const

describe("launch-critical e2e coverage", () => {
  it.each(LAUNCH_FLOWS)("$item → $file", ({ file, title }) => {
    expect(readFileSync(join("tests/e2e", file), "utf8")).toContain(title)
  })
})
