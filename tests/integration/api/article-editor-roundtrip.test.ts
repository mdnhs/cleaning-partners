// @vitest-environment jsdom
import { Editor } from "@tiptap/core"
import { eq } from "drizzle-orm"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import {
  normalizeRichTextDoc,
  richTextExtensions,
} from "@/components/admin/rich-text/extensions"
import type { WithMedia } from "@/lib/media"
import { ArticleBlocks } from "@/lib/rich-text/render"
import type { ArticleDto } from "@/lib/schemas/api/articles"
import type { RichTextDoc } from "@/lib/schemas/common"
import { getDb } from "@/server/db/client"
import { articles } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"

import * as frozen from "../../unit/rich-text/frozen-markup"
import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

const SLUG = "5-signs-your-office-needs-a-professional-clean"
const CHECK_ICON = "/images/services/check.svg"

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
})

describe("R5-3 round trip: open the seeded article, save unchanged, publish", () => {
  it("stores the same body and the site renders frozen.WHOLE", async () => {
    const editor = await signedInUser(["editor"])
    const call = (path: string, method = "GET", body?: unknown) =>
      adminRequest(path, { cookie: editor.cookie, method, json: body })
    const db = getDb()
    const [seeded] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, SLUG))
    const original = (seeded.published as { body: RichTextDoc }).body
    expect(JSON.stringify(original)).toContain('"variant":"lead"')
    expect(JSON.stringify(original)).toContain('"variant":"checklist"')

    // Open it as the editor does: API -> TipTap -> normalized JSON.
    const opened = (await (
      await call(`/articles/${seeded.id}`)
    ).json()) as ArticleDto
    const tiptap = new Editor({
      extensions: richTextExtensions("full"),
      content: opened.draft.body as object,
    })
    const edited = normalizeRichTextDoc(tiptap.getJSON())
    tiptap.destroy()
    expect(edited).toEqual(original)

    // Save without changes, then publish it.
    const saved = await call(`/articles/${seeded.id}/draft`, "PUT", {
      draft: { ...opened.draft, body: edited },
      version: opened.version,
    })
    expect(saved.status).toBe(200)
    const savedDto = (await saved.json()) as ArticleDto
    expect(savedDto.draft.body).toEqual(original)
    const published = await call(`/articles/${seeded.id}/publish`, "POST", {
      version: savedDto.version,
    })
    expect(published.status).toBe(200)

    const [stored] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, SLUG))
    const storedBody = (stored.published as { body: RichTextDoc }).body
    expect(storedBody).toEqual(original)
    expect((stored.draft as { body: RichTextDoc }).body).toEqual(original)

    const html = renderToStaticMarkup(
      createElement(ArticleBlocks, {
        doc: storedBody as unknown as WithMedia<RichTextDoc>,
        checkIcon: CHECK_ICON,
      })
    )
    expect(html).toBe(frozen.WHOLE)
  })
})
