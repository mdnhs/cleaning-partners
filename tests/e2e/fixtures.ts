import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import type { Page } from "@playwright/test"

/** Written by tests/e2e/seed.ts, read by the specs (gitignored). */
export const FIXTURES_FILE = resolve("tests/e2e/.state/fixtures.json")
export const E2E_PASSWORD = "e2e-password-0123456789"
/** SMTP password integrations.spec.ts saves. */
export const E2E_SMTP_PASSWORD = "smtp-secret-1234"

export type E2EFixtures = {
  owner: { email: string; name: string }
  editor: { email: string; name: string }
  invitee: { email: string; name: string; inviteUrl: string }
  twoFactor: { email: string; name: string; totpUri: string }
  account: { email: string; name: string }
  /** 2FA on; account.spec turns it off. */
  twoFactorOff: { email: string; name: string; totpUri: string }
  /** Articles workflow (Phase 5): drafts and submits, never publishes. */
  author: { email: string; name: string }
  /** Leads (Phase 7): sees only Dashboard, Leads and Account. */
  intake: { email: string; name: string }
  /** password-reset.spec: a single-use reset link minted by the seed. */
  resetUser: { email: string; name: string; resetUrl: string }
}

/**
 * server.js runs with production rate limits (sign-in 5/min per IP, keyed
 * on X-Forwarded-For). Each test signs in from its own documentation-range
 * address so the suite never trips a limit meant for one client.
 */
export function clientIpFor(testTitle: string): string {
  const [a, b] = createHash("sha256").update(testTitle).digest()
  return `198.18.${a}.${b}`
}

/**
 * Resolves once React has hydrated the footer, so a negative assertion that
 * follows cannot pass before the client effects (consent, trackers) have run.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const f = document.querySelector("footer")
    return !!f && Object.keys(f).some((k) => k.startsWith("__reactFiber"))
  })
}

export function readFixtures(): E2EFixtures {
  return JSON.parse(readFileSync(FIXTURES_FILE, "utf8")) as E2EFixtures
}

/** The dashboard's h1: "Good morning, Edith" (time of day in Ireland, first name). */
export function greeting(name: string): RegExp {
  const first = name
    .trim()
    .split(/\s+/)[0]!
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`^Good (morning|afternoon|evening), ${first}$`)
}
