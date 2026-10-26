import { expect, test } from "@playwright/test"

// Master 8.1: title, description and canonical must be in <head> for any user
// agent, not only known crawlers (proxy.ts marks public document requests for
// blocking metadata, lib/seo/blocking-metadata.ts). The Lighthouse SEO 100
// half arrives in Task 14.

const LIGHTHOUSE_LIKE_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

test("home page metadata is in <head> for a browser user agent", async ({
  request,
}) => {
  const res = await request.get("/", {
    headers: { "user-agent": LIGHTHOUSE_LIKE_UA },
  })
  expect(res.status()).toBe(200)
  const html = await res.text()
  const head = html.slice(0, html.indexOf("</head>"))
  expect(head).toMatch(/<title>[^<]+<\/title>/)
  expect(head).toMatch(/<meta name="description" content="[^"]+"/)
  expect(head).toMatch(/<link rel="canonical" href="[^"]+"/)
})
