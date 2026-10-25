import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { firstVisibleChild } from "@/lib/admin/nav"
import { hasPermission } from "@/lib/auth/permissions"
import { ROLES } from "@/lib/auth/roles"
import { config, proxy } from "@/proxy"

type Init = { cookie?: string; method?: string }
const request = (path: string, init: Init = {}) =>
  new NextRequest(new URL(path, "http://127.0.0.1:3200"), {
    method: init.method ?? "GET",
    headers: init.cookie ? { cookie: init.cookie } : {},
  })
const run = (path: string, init?: Init) => proxy(request(path, init))

const matches = (path: string) =>
  unstable_doesMiddlewareMatch({
    config,
    url: `http://127.0.0.1:3200${path}`,
  })

describe("proxy.ts matcher", () => {
  // Public pages join the matcher in Phase 8 (redirects, real 404s).
  it("runs on /admin only; never /api, static files or public pages", () => {
    expect(config.matcher).toEqual(["/admin/:path*"])
    for (const path of ["/admin", "/admin/x", "/admin/sign-in"])
      expect(matches(path), path).toBe(true)
    for (const path of [
      "/",
      "/about",
      "/api/v1/x",
      "/_next/static/x",
      "/robots.txt",
      "/admin-old",
    ])
      expect(matches(path), path).toBe(false)
  })
})

describe("proxy.ts (optimistic /admin gate)", () => {
  it("redirects /admin without a session cookie to /admin/sign-in?next=/admin", () => {
    const res = run("/admin")
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.pathname).toBe("/admin/sign-in")
    expect(location.searchParams.get("next")).toBe("/admin")
    expect(res.headers.get("x-robots-tag")).toBe("noindex")
  })

  it("keeps the query string in next", () => {
    const res = run("/admin/users?page=2")
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.searchParams.get("next")).toBe("/admin/users?page=2")
  })

  it("lets the auth pages through without a cookie", () => {
    for (const path of [
      "/admin/sign-in",
      "/admin/two-factor",
      "/admin/set-password",
      "/admin/reset-password",
      "/admin/forgot-password",
    ]) {
      const res = run(path)
      expect(res.headers.get("location"), path).toBeNull()
      expect(res.headers.get("x-robots-tag")).toBe("noindex")
    }
  })

  it("lets requests with a session cookie through (http and https cookie names)", () => {
    for (const cookie of [
      "cp.session_token=abc.def",
      "__Secure-cp.session_token=abc.def",
    ]) {
      const res = run("/admin", { cookie })
      expect(res.headers.get("location")).toBeNull()
      expect(res.headers.get("x-robots-tag")).toBe("noindex")
    }
  })

  it("sends a signed-in /admin/settings to the first key with a 307", () => {
    const cookie = "cp.session_token=abc.def"
    const res = run("/admin/settings", { cookie })
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.pathname).toBe("/admin/settings/site")
    expect(location.search).toBe("")
    // The proxy has no roles: its target must be every settings reader's
    // first rail child (the registry, as the page's own redirect uses).
    for (const role of ROLES)
      if (hasPermission([role], { settings: ["read"] }))
        expect(firstVisibleChild("settings", [role])?.href).toBe(
          location.pathname
        )
    expect(res.headers.get("x-robots-tag")).toBe("noindex")
    // Only the exact path; keys and a signed-out visit are left alone.
    expect(
      run("/admin/settings/contact", { cookie }).headers.get("location")
    ).toBeNull()
    const signedOut = new URL(
      run("/admin/settings").headers.get("location") ?? ""
    )
    expect(signedOut.pathname).toBe("/admin/sign-in")
  })

  it("does not treat look-alike paths as auth pages", () => {
    expect(run("/admin/sign-in-later").status).toBe(307)
  })

  it("gates sub-paths of auth pages (only the exact page is public)", () => {
    expect(run("/admin/sign-in/anything").status).toBe(307)
    expect(run("/admin/sign-in/").headers.get("location")).toBeNull()
  })
})
