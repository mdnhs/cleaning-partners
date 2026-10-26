import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { firstVisibleChild } from "@/lib/admin/nav"
import { hasPermission } from "@/lib/auth/permissions"
import { ROLES } from "@/lib/auth/roles"
import { REQUEST_PATH_HEADER } from "@/lib/request-path"
import {
  BLOCKING_METADATA_MARK,
  HTML_LIMITED_BOTS,
} from "@/lib/seo/blocking-metadata"
import { config, proxy } from "@/proxy"

type Init = {
  cookie?: string
  method?: string
  headers?: Record<string, string>
}
const request = (path: string, init: Init = {}) =>
  new NextRequest(new URL(path, "http://127.0.0.1:3200"), {
    method: init.method ?? "GET",
    headers: {
      ...init.headers,
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
  })
const run = (path: string, init?: Init) => proxy(request(path, init))

const matches = (path: string) =>
  unstable_doesMiddlewareMatch({
    config,
    url: `http://127.0.0.1:3200${path}`,
  })

describe("proxy.ts matcher", () => {
  it("admin plus public pages; never /api, static files, OG cards, sitemap or robots", () => {
    expect(config.matcher).toEqual([
      "/admin/:path*",
      "/((?!api(?:/|$)|admin(?:/|$)|_next/|og/|images/|favicon\\.ico$|sitemap\\.xml$|robots\\.txt$).*)",
    ])
  })

  const matchesWith = (matcher: string | string[], path: string) =>
    unstable_doesMiddlewareMatch({
      config: { matcher },
      url: `http://127.0.0.1:3200${path}`,
    })

  it("the public matcher skips only whole reserved segments and exact files", () => {
    const publicMatcher = config.matcher[1]
    for (const path of [
      "/",
      "/about",
      "/services/office-cleaning",
      "/apiary",
      "/api-docs",
      "/admin-old",
      "/administration",
      "/images-old",
      "/sitemap.xml.bak",
      "/old/robots.txt",
    ])
      expect(matchesWith(publicMatcher, path), path).toBe(true)
    for (const path of [
      "/api",
      "/api/v1/x",
      "/admin",
      "/admin/x",
      "/_next/static/x",
      "/og/service/x",
      "/images/logo.svg",
      "/sitemap.xml",
      "/robots.txt",
      "/favicon.ico",
    ])
      expect(matchesWith(publicMatcher, path), path).toBe(false)
  })

  it("the whole config still runs the admin gate and never sees /api", () => {
    for (const path of [
      "/admin",
      "/admin/x",
      "/admin/sign-in",
      "/admin-old",
      "/apiary",
    ])
      expect(matches(path), path).toBe(true)
    for (const path of ["/api/v1/x", "/_next/static/x", "/robots.txt"])
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

describe("proxy.ts (blocking metadata for public documents only)", () => {
  const CHROME = "Mozilla/5.0 (Macintosh) Chrome/140.0 Safari/537.36"
  /** The user agent the page renders with (NextResponse.next({ request })). */
  const renderedUa = (res: Response) =>
    res.headers
      .get("x-middleware-override-headers")
      ?.split(",")
      .includes("user-agent")
      ? res.headers.get("x-middleware-request-user-agent")
      : null

  it("marks the user agent of a public document request", () => {
    const res = run("/about", { headers: { "user-agent": CHROME } })
    expect(res.headers.get("x-middleware-next")).toBe("1")
    expect(renderedUa(res)).toBe(`${CHROME} ${BLOCKING_METADATA_MARK}`)
    expect(HTML_LIMITED_BOTS.test(renderedUa(res) ?? "")).toBe(true)
  })

  it("a request without a user agent is marked too", () => {
    expect(renderedUa(run("/"))).toBe(BLOCKING_METADATA_MARK)
  })

  it("never marks RSC requests (client navigations and prefetches)", () => {
    for (const headers of [
      { "user-agent": CHROME, rsc: "1" } as Record<string, string>,
      { "user-agent": CHROME, rsc: "1", "next-router-prefetch": "1" },
    ]) {
      const res = run("/about", { headers })
      expect(res.headers.get("x-middleware-next")).toBe("1")
      expect(renderedUa(res)).toBe(CHROME)
    }
  })

  it("strips a client-sent mark from RSC requests (no opting into bot rendering)", () => {
    for (const ua of [
      `${CHROME} ${BLOCKING_METADATA_MARK}`,
      `${BLOCKING_METADATA_MARK} ${CHROME}`,
    ]) {
      const res = run("/about", { headers: { "user-agent": ua, rsc: "1" } })
      expect(renderedUa(res)).toBe(CHROME)
      expect(HTML_LIMITED_BOTS.test(renderedUa(res) ?? "")).toBe(false)
    }
  })

  it("never marks admin requests", () => {
    const res = run("/admin", {
      cookie: "cp.session_token=abc.def",
      headers: { "user-agent": CHROME },
    })
    expect(renderedUa(res)).toBeNull()
  })

  describe("under next dev", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development")
      return () => vi.unstubAllEnvs()
    })

    it("does not mark document requests", () => {
      const res = run("/", { headers: { "user-agent": CHROME } })
      expect(renderedUa(res)).toBe(CHROME)
    })

    it("still strips a client-sent mark from documents", () => {
      const res = run("/about", {
        headers: { "user-agent": `${CHROME} ${BLOCKING_METADATA_MARK}` },
      })
      expect(renderedUa(res)).toBe(CHROME)
    })

    it("a request without a user agent stays without one", () => {
      expect(renderedUa(run("/"))).toBeNull()
    })
  })

  it("only the mark makes metadata blocking (htmlLimitedBots)", () => {
    expect(HTML_LIMITED_BOTS.test(CHROME)).toBe(false)
    expect(HTML_LIMITED_BOTS.test("Googlebot/2.1")).toBe(false)
    expect(
      HTML_LIMITED_BOTS.test(`Googlebot/2.1 ${BLOCKING_METADATA_MARK}`)
    ).toBe(true)
  })
})

describe("proxy.ts (the public page's path for the preview exit)", () => {
  const forwarded = (res: Response) =>
    res.headers
      .get("x-middleware-override-headers")
      ?.split(",")
      .includes(REQUEST_PATH_HEADER)
      ? res.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)
      : null

  it("documents and RSC requests carry the path and query", () => {
    expect(forwarded(run("/terms?x=1"))).toBe("/terms?x=1")
    expect(forwarded(run("/about", { headers: { rsc: "1" } }))).toBe("/about")
  })

  it("a client-sent value never reaches a POST (server action) either", () => {
    const res = run("/contact", {
      method: "POST",
      headers: { [REQUEST_PATH_HEADER]: "/elsewhere" },
    })
    expect(res.headers.get("x-middleware-next")).toBe("1")
    expect(res.headers.get("x-middleware-override-headers")).not.toBeNull()
    expect(forwarded(res)).toBeNull()
  })

  it("a client-sent value is replaced on GET", () => {
    const res = run("/about", {
      headers: { [REQUEST_PATH_HEADER]: "/elsewhere" },
    })
    expect(forwarded(res)).toBe("/about")
  })
})
