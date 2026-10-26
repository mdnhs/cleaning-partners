import { type APIRequestContext, expect } from "@playwright/test"

import { BASE_URL } from "./env"

// Takes the theme (draft and published) before a test and puts both back in
// `finally`, so a test that publishes never leaks into the visual run.

const headers = { origin: BASE_URL }
const URL = "/api/v1/admin/appearance"

type ThemeSnapshot = {
  draft: unknown
  published: unknown
  version: number
  hasDraft: boolean
}

export async function takeThemeSnapshot(
  request: APIRequestContext
): Promise<ThemeSnapshot> {
  return (await (await request.get(URL)).json()) as ThemeSnapshot
}

async function saveDraft(
  request: APIRequestContext,
  draft: unknown
): Promise<ThemeSnapshot> {
  const current = await takeThemeSnapshot(request)
  const saved = await request.put(`${URL}/draft`, {
    headers,
    data: { version: current.version, draft },
  })
  expect(saved.status()).toBe(200)
  return (await saved.json()) as ThemeSnapshot
}

export async function restoreThemeSnapshot(
  request: APIRequestContext,
  before: ThemeSnapshot
) {
  const now = await takeThemeSnapshot(request)
  if (JSON.stringify(now.published) !== JSON.stringify(before.published)) {
    const saved = await saveDraft(request, before.published)
    const published = await request.post(`${URL}/publish`, {
      headers,
      data: { version: saved.version },
    })
    expect(published.status()).toBe(200)
  }
  const after = await takeThemeSnapshot(request)
  if (before.hasDraft) {
    await saveDraft(request, before.draft)
  } else if (after.hasDraft) {
    const discarded = await request.post(`${URL}/discard`, {
      headers,
      data: { version: after.version },
    })
    expect(discarded.status()).toBe(200)
  }
}
