// One-off: copy the Services (and the media rows they reference) from one
// database to another without touching anything else.
//   export:  pnpm tsx:server scripts/services-sync.ts export <out.json>
//   apply:   node scripts/dist/services-sync.mjs apply <in.json> [--yes] [--once]
// `apply` is a dry run (prints what would change) unless --yes is given. With
// --yes it backs the current services up to <in.json>.before-<stamp>.json,
// then, in ONE transaction, upserts the referenced media (matched on
// driver+key, ids remapped when production already has that file), upserts
// every service by slug (mediaIds remapped) and deletes the services that are
// not in the file. Nothing else is read or written.
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { eq, inArray, notInArray } from "drizzle-orm"

import { getDb } from "@/server/db/client"
import { media, services } from "@/server/db/schema"

import {
  findSettingsRow,
  upsertSettingsDraft,
} from "@/server/modules/settings/repo"

import { runScript } from "./lib/run-script"

// --once: skip when this exact file was already applied (marker row), and
// record it after the write. Used by the container entrypoint so a restart
// or later deploy never overwrites what editors changed since.
const MARKER = "ops.services-sync"

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

type MediaRow = typeof media.$inferSelect
type ServiceRow = typeof services.$inferSelect
type Payload = { media: MediaRow[]; services: ServiceRow[] }

const dateReviver = (_: string, v: unknown) =>
  typeof v === "string" && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(v)
    ? new Date(v)
    : v

await runScript("services-sync", async () => {
  const [mode, file, ...flags] = process.argv.slice(2)
  const flag = flags.includes("--yes") ? "--yes" : undefined
  const once = flags.includes("--once")
  if (!file || (mode !== "export" && mode !== "apply"))
    throw new Error(
      "Usage: services-sync export <out.json> | apply <in.json> [--yes]"
    )
  const db = getDb()

  if (mode === "export") {
    const svc = await db.select().from(services)
    const text = JSON.stringify(svc)
    const ids = [...new Set(text.match(UUID) ?? [])]
    const rows = ids.length
      ? await db.select().from(media).where(inArray(media.id, ids))
      : []
    writeFileSync(
      file,
      JSON.stringify({ media: rows, services: svc } satisfies Payload, null, 2)
    )
    console.log(
      `[services-sync] exported ${svc.length} services, ${rows.length} media -> ${file}`
    )
    return
  }

  const raw = readFileSync(file, "utf8")
  const hash = createHash("sha256").update(raw).digest("hex")
  if (once) {
    const marker = await findSettingsRow(db, MARKER)
    if ((marker?.draft as { hash?: string } | undefined)?.hash === hash) {
      console.log(
        "[services-sync] this file was already applied: nothing changed"
      )
      return
    }
  }
  const data = JSON.parse(raw, dateReviver) as Payload
  const yes = flag === "--yes"

  // media: match on (driver, key); map source id -> target id.
  const target = await db.select().from(media)
  const byKey = new Map(target.map((m) => [`${m.driver}:${m.key}`, m]))
  const idMap = new Map<string, string>()
  const mediaToInsert: MediaRow[] = []
  for (const m of data.media) {
    const hit = byKey.get(`${m.driver}:${m.key}`)
    if (hit) idMap.set(m.id, hit.id)
    else {
      idMap.set(m.id, m.id)
      mediaToInsert.push({ ...m, createdBy: null })
    }
  }
  const remap = <T>(value: T): T =>
    JSON.parse(
      JSON.stringify(value).replace(UUID, (id) => idMap.get(id) ?? id),
      dateReviver
    )

  const current = await db.select().from(services)
  const slugs = data.services.map((s) => s.slug)
  const toDelete = current.filter((s) => !slugs.includes(s.slug))
  console.log(
    `[services-sync] prod now: ${current.map((s) => s.slug).join(", ") || "(none)"}`
  )
  console.log(`[services-sync] will upsert: ${slugs.join(", ")}`)
  console.log(
    `[services-sync] will delete: ${toDelete.map((s) => s.slug).join(", ") || "(none)"}`
  )
  console.log(
    `[services-sync] media: ${mediaToInsert.length} new, ${data.media.length - mediaToInsert.length} already on target`
  )
  if (!yes) {
    console.log("[services-sync] dry run: nothing written (add --yes)")
    return
  }

  const dir = existsSync("/data")
    ? "/data/backups"
    : join(tmpdir(), "cp-backups")
  mkdirSync(dir, { recursive: true })
  const backup = join(
    dir,
    `services-before-${new Date().toISOString().replace(/[-:.]/g, "")}.json`
  )
  writeFileSync(backup, JSON.stringify(current, null, 2))
  console.log(`[services-sync] backup of current services -> ${backup}`)

  await db.transaction(async (tx) => {
    if (mediaToInsert.length) await tx.insert(media).values(mediaToInsert)
    for (const s of data.services) {
      const row = remap({ ...s, updatedBy: null })
      const existing = current.find((c) => c.slug === s.slug)
      if (existing) {
        const { id: _id, slug: _slug, ...rest } = row
        await tx.update(services).set(rest).where(eq(services.id, existing.id))
      } else await tx.insert(services).values(row)
    }
    if (slugs.length)
      await tx.delete(services).where(notInArray(services.slug, slugs))
  })
  if (once)
    await upsertSettingsDraft(db, MARKER, {
      hash,
      appliedAt: new Date().toISOString(),
    })
  console.log(`[services-sync] done: ${slugs.length} services written`)
})
