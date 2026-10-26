import { getSessionCookie } from "better-auth/cookies"
import { type NextRequest, NextResponse } from "next/server"

import { isAdminAuthPath } from "@/lib/auth/redirect"
import { REQUEST_PATH_HEADER } from "@/lib/request-path"
import { blockingMetadataHeaders } from "@/lib/seo/blocking-metadata"

/**
 * Admin gate, optimistic only: checks that a session cookie is present (no
 * DB). The real checks are requireSession() in the panel layout and the
 * Hono middleware. X-Robots-Tag for /api is set by Hono.
 */
export function adminGate(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  let response: NextResponse
  if (
    !isAdminAuthPath(pathname) &&
    !getSessionCookie(request, { cookiePrefix: "cp" })
  ) {
    const signIn = new URL("/admin/sign-in", request.url)
    signIn.searchParams.set("next", `${pathname}${search}`)
    response = NextResponse.redirect(signIn)
  } else if (pathname === "/admin/settings") {
    // No settings overview: a real 307 to the first key (the page keeps a
    // redirect for client-side navigation, which never reaches the proxy).
    response = NextResponse.redirect(
      new URL("/admin/settings/site", request.url),
      307
    )
  } else {
    response = NextResponse.next()
  }
  response.headers.set("X-Robots-Tag", "noindex")
  return response
}

/**
 * Public pages (GET/HEAD): documents render with blocking metadata (in
 * <head>; not under next dev) and every page learns its own path
 * (lib/request-path.ts). Any other method has the path header stripped, so a
 * client-sent value never reaches a page. The redirects table and real 404s
 * join this gate in Task 8, fail-open as SP's does.
 */
export function publicGate(request: NextRequest): NextResponse {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const headers = new Headers(request.headers)
    headers.delete(REQUEST_PATH_HEADER)
    return NextResponse.next({ request: { headers } })
  }
  const headers = blockingMetadataHeaders(request.headers)
  const { pathname, search } = request.nextUrl
  headers.set(REQUEST_PATH_HEADER, `${pathname}${search}`)
  return NextResponse.next({ request: { headers } })
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  if (pathname === "/admin" || pathname.startsWith("/admin/"))
    return adminGate(request)
  return publicGate(request)
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Public pages only. Never /api: the proxy buffers request bodies and
    // truncates them over 10 MB (uploads). Static files, share cards,
    // sitemap and robots need no lookup. Each exclusion is anchored to a
    // whole segment/file so look-alikes (/apiary, /admin-old) still match.
    "/((?!api(?:/|$)|admin(?:/|$)|_next/|og/|images/|favicon\\.ico$|sitemap\\.xml$|robots\\.txt$).*)",
  ],
}
