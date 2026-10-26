import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Client } from "pg"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { runBackup } from "@/server/lib/backup"
import { withDatabase } from "@/server/lib/backup/pg-tools"
import { restoreDrill } from "@/server/lib/backup/restore-drill"
import { diskBackupStore, type BackupStore } from "@/server/lib/backup/store"

import { resetDb, TEST_DATABASE_URL } from "../db"
import { createUser } from "../helpers/auth"

let dir: string
beforeEach(async () => {
  await resetDb()
  dir = await mkdtemp(join(tmpdir(), "cp-drill-it-"))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

async function scratchExists(): Promise<boolean> {
  const client = new Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    const { rowCount } = await client.query(
      "select 1 from pg_database where datname = 'cp_test_restore_drill'"
    )
    return rowCount === 1
  } finally {
    await client.end()
  }
}

async function userCount(): Promise<number> {
  const client = new Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    const { rows } = await client.query("select count(*)::int as n from users")
    return rows[0].n as number
  } finally {
    await client.end()
  }
}

describe("restoreDrill (spec §14)", () => {
  it("restores the newest backup into cp_test_restore_drill and matches the manifest", async () => {
    await createUser({ roles: ["editor"] })
    await createUser({ roles: ["admin"] })
    const store = diskBackupStore(dir)
    await runBackup({ url: TEST_DATABASE_URL, store })
    const result = await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(result).toMatchObject({
      scratchDatabase: "cp_test_restore_drill",
      mismatches: [],
      ok: true,
    })
    expect(result.backup).toMatch(/^cp-cp_test-\d{8}T\d{6}Z\.dump$/)
    expect(result.tables).toBeGreaterThan(10)
  })

  it("drops the scratch database afterwards, and keeps it with keepScratch", async () => {
    const store = diskBackupStore(dir)
    await runBackup({ url: TEST_DATABASE_URL, store })
    await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(await scratchExists()).toBe(false)
    await restoreDrill({ url: TEST_DATABASE_URL, store, keepScratch: true })
    expect(await scratchExists()).toBe(true)
    await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(await scratchExists()).toBe(false)
  })

  it("refuses a scratch name it cannot derive safely", async () => {
    const database = "Cp_Mixed_Case"
    const stub: BackupStore = {
      ...diskBackupStore(dir),
      list: async () =>
        ["dump", "json"].map((ext) => ({
          name: `cp-${database}-20261016T120000Z.${ext}`,
          bytes: 1,
          createdAt: new Date(),
        })),
    }
    await expect(
      restoreDrill({
        url: withDatabase(TEST_DATABASE_URL, database),
        store: stub,
      })
    ).rejects.toThrow(
      "Cannot derive a scratch database name (Cp_Mixed_Case_restore_drill)"
    )
  })

  it("never touches the source database", async () => {
    await createUser({ roles: ["editor"] })
    const store = diskBackupStore(dir)
    await runBackup({ url: TEST_DATABASE_URL, store })
    await createUser({ roles: ["viewer"] })
    expect(await userCount()).toBe(2)
    // The backup holds 1 user; the live database has 2 and keeps them.
    const result = await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(result.ok).toBe(true)
    expect(await userCount()).toBe(2)
  })

  it("reports a count that does not match the manifest", async () => {
    await createUser({ roles: ["editor"] })
    const store = diskBackupStore(dir)
    const { name } = await runBackup({ url: TEST_DATABASE_URL, store })
    const manifestFile = join(dir, name.replace(/\.dump$/, ".json"))
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"))
    manifest.counts["public.users"] = 99
    await writeFile(manifestFile, JSON.stringify(manifest))
    const result = await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(result.ok).toBe(false)
    expect(result.mismatches).toEqual([
      { table: "public.users", expected: 99, actual: 1 },
    ])
  })

  it("refuses a dump whose checksum does not match", async () => {
    const store = diskBackupStore(dir)
    const { name } = await runBackup({ url: TEST_DATABASE_URL, store })
    await appendFile(join(dir, name), "x")
    await expect(
      restoreDrill({ url: TEST_DATABASE_URL, store })
    ).rejects.toThrow("checksum does not match its manifest")
    expect(await scratchExists()).toBe(false)
  })

  it("skips a newer dump that has no manifest (interrupted backup)", async () => {
    const store = diskBackupStore(dir)
    const { name } = await runBackup({
      url: TEST_DATABASE_URL,
      store,
      now: new Date("2026-10-16T12:00:00Z"),
    })
    await writeFile(join(dir, "cp-cp_test-20261017T120000Z.dump"), "PGDMP-cut")
    const result = await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(result).toMatchObject({ backup: name, ok: true })
  })

  // Environments can share one store (db:sync with --keep-integrations); the
  // drill verifies this database's newest dump only.
  it("ignores another database's dumps, however they sort", async () => {
    const store = diskBackupStore(dir)
    const { name } = await runBackup({
      url: TEST_DATABASE_URL,
      store,
      now: new Date("2026-10-16T12:00:00Z"),
    })
    const manifest = JSON.parse(
      await readFile(join(dir, name.replace(/\.dump$/, ".json")), "utf8")
    )
    manifest.counts["public.users"] = 99
    for (const other of ["cp-cp_test_staging", "cp-zz"]) {
      const base = `${other}-20991231T000000Z`
      await writeFile(
        join(dir, `${base}.dump`),
        await readFile(join(dir, name))
      )
      await writeFile(join(dir, `${base}.json`), JSON.stringify(manifest))
    }
    const result = await restoreDrill({ url: TEST_DATABASE_URL, store })
    expect(result).toMatchObject({ backup: name, ok: true })
  })

  it("explains an empty store", async () => {
    await expect(
      restoreDrill({ url: TEST_DATABASE_URL, store: diskBackupStore(dir) })
    ).rejects.toThrow(`No backup found in ${dir}`)
  })
})
