import type { NextConfig } from "next"

import { HSTS } from "./lib/security-headers"

/**
 * CSP directives that restrict nothing the site loads: no `<base>` hijack,
 * no plugins, framing as allowed below. Deliberately no script-src /
 * connect-src / img-src / frame-src: Cache Components serve static shells
 * whose inline bootstrap cannot carry a per-request nonce (Next docs
 * "content-security-policy": nonces need fully dynamic rendering, PPR is
 * incompatible), and Marketing ▸ Tracking / Custom code, Turnstile
 * (challenges.cloudflare.com) and the AI panel need inline loaders and
 * third-party hosts — docs/runbook.md lists what a stricter policy must allow.
 */
const cspWith = (frameAncestors: string) =>
  `base-uri 'self'; object-src 'none'; frame-ancestors ${frameAncestors}`

/** Spec §13 hardening headers for pages (Hono's secureHeaders() covers /api). */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The admin's live preview frames the public site (same origin).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Ignored by browsers over http (local, E2E); Traefik serves https.
  { key: "Strict-Transport-Security", value: HSTS },
  { key: "Content-Security-Policy", value: cspWith("'self'") },
]

// "standalone" traces only the files the server needs, so the Docker image
// ships a small server.js instead of the full node_modules.
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/((?!api/).*)", headers: SECURITY_HEADERS },
      // The admin is never framed (later rules override the same key).
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: cspWith("'none'") },
        ],
      },
    ]
  },
}

export default nextConfig
