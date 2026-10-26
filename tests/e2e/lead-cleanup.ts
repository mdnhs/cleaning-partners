import { type APIRequestContext, expect } from "@playwright/test"

import { E2E_ADMIN } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD } from "./fixtures"

/** Every e2e visitor's address ends here (R7-11); cleanup goes by it. */
export const E2E_LEAD_DOMAIN = "e2e.cleaningpartners.test"

/**
 * Deletes every lead whose address is `email` (or, with a bare domain, ends
 * in `@domain`) through the admin API (signed in as the
 * e2e admin on `request`'s own cookie jar), then checks the sidebar's
 * new-leads count is back to 0. The visual suite runs against the same
 * server and asserts that badge is hidden in its shots, so a test that
 * creates a lead must remove it again.
 */
export async function deleteLeadsFrom(
  request: APIRequestContext,
  email: string
): Promise<void> {
  // Origin: the admin API's CSRF guard (sameOrigin) checks unsafe methods.
  const headers = {
    origin: BASE_URL,
    "x-forwarded-for": clientIpFor(`lead cleanup ${email}`),
  }
  const signIn = await request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: E2E_ADMIN.email, password: E2E_PASSWORD },
  })
  expect(signIn.ok()).toBe(true)
  const match = (value: string) =>
    email.includes("@") ? value === email : value.endsWith(`@${email}`)
  // Deleting shifts the pages, so always re-read page 1 until nothing matches
  // (a single pageSize=100 read would miss every lead beyond the first 100).
  const PAGE = 100
  for (let round = 0; round < 50; round++) {
    const list = await request.get(
      `/api/v1/admin/leads?status=all&pageSize=${PAGE}&q=${encodeURIComponent(email)}`,
      { headers }
    )
    expect(list.ok()).toBe(true)
    const { items } = (await list.json()) as {
      items: { id: string; email: string }[]
    }
    const mine = items.filter((item) => match(item.email))
    for (const lead of mine) {
      const removed = await request.delete(`/api/v1/admin/leads/${lead.id}`, {
        headers,
      })
      expect(removed.ok()).toBe(true)
    }
    if (mine.length === 0) break
  }
  const badge = await request.get("/api/v1/admin/leads/badge", { headers })
  expect(await badge.json()).toEqual({ newLeads: 0 })
}
