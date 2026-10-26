import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { S3Client } from "@aws-sdk/client-s3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { R2Config } from "@/lib/schemas/integrations"
import { r2ObjectKey } from "@/server/lib/r2-client"
import {
  BACKUP_PREFIX,
  completeDumps,
  diskBackupStore,
  pruneBackups,
  r2BackupStore,
} from "@/server/lib/backup/store"

let dir: string
let src: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cp-store-"))
  src = join(dir, "src.bin")
  await writeFile(src, "PGDMP-fake")
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const stamp = (day: number) =>
  `cp-cp_test-202610${String(day).padStart(2, "0")}T020000Z`

describe("disk backup store", () => {
  it("puts, lists newest first, downloads and deletes", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    await store.put(`${stamp(1)}.dump`, src)
    await store.put(`${stamp(2)}.dump`, src)
    expect((await store.list()).map((o) => o.name)).toEqual([
      `${stamp(2)}.dump`,
      `${stamp(1)}.dump`,
    ])
    const out = join(dir, "out.bin")
    await store.download(`${stamp(1)}.dump`, out)
    expect(await readFile(out, "utf8")).toBe("PGDMP-fake")
    await store.delete(`${stamp(1)}.dump`)
    expect((await store.list()).map((o) => o.name)).toEqual([
      `${stamp(2)}.dump`,
    ])
  })

  it("writes owner-only files and leaves no temp file behind", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    await store.put(`${stamp(1)}.dump`, src)
    expect((await stat(join(dir, "backups"))).mode & 0o777).toBe(0o700)
    expect(
      (await stat(join(dir, "backups", `${stamp(1)}.dump`))).mode & 0o777
    ).toBe(0o600)
    expect(await readdir(join(dir, "backups"))).toEqual([`${stamp(1)}.dump`])
  })

  it("tightens an existing world-readable backup dir and its files", async () => {
    const backups = join(dir, "backups")
    await mkdir(backups, { mode: 0o755 })
    await chmod(backups, 0o755)
    const old = join(backups, `${stamp(1)}.dump`)
    await writeFile(old, "PGDMP-old", { mode: 0o644 })
    await chmod(old, 0o644)
    await diskBackupStore(backups).put(`${stamp(2)}.dump`, src)
    expect((await stat(backups)).mode & 0o777).toBe(0o700)
    expect((await stat(old)).mode & 0o777).toBe(0o600)
  })

  it("ignores interrupted backups (a dump without its manifest)", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    for (let day = 1; day <= 3; day++) {
      await store.put(`${stamp(day)}.dump`, src)
      await store.put(`${stamp(day)}.json`, src)
    }
    await store.put(`${stamp(0)}.dump`, src) // old orphan
    await store.put(`${stamp(4)}.dump`, src) // newest, no manifest
    expect(
      completeDumps(await store.list(), "cp_test").map((o) => o.name)
    ).toEqual([`${stamp(3)}.dump`, `${stamp(2)}.dump`, `${stamp(1)}.dump`])
    expect(await pruneBackups(store, 2, "cp_test")).toEqual([
      `${stamp(1)}.dump`,
      `${stamp(0)}.dump`,
    ])
    expect((await store.list()).map((o) => o.name)).toEqual([
      `${stamp(4)}.dump`,
      `${stamp(3)}.json`,
      `${stamp(3)}.dump`,
      `${stamp(2)}.json`,
      `${stamp(2)}.dump`,
    ])
  })

  // Final review I2: one store can hold several databases' dumps; each
  // database prunes and restores only its own, ordered by the stamp.
  it("prunes and picks only this database's dumps", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    const other = (db: string, day: number) =>
      `cp-${db}-202610${String(day).padStart(2, "0")}T020000Z`
    const names: string[] = []
    for (let day = 1; day <= 3; day++)
      names.push(stamp(day), other("cp_test_staging", day), other("zz", day))
    names.push("cp-cp_test-oops") // not a backup name of ours
    for (const base of names) {
      await store.put(`${base}.dump`, src)
      await store.put(`${base}.json`, src)
    }
    const all = await store.list()
    expect(completeDumps(all, "cp_test").map((o) => o.name)).toEqual([
      `${stamp(3)}.dump`,
      `${stamp(2)}.dump`,
      `${stamp(1)}.dump`,
    ])
    expect(await pruneBackups(store, 1, "cp_test")).toEqual([
      `${stamp(2)}.dump`,
      `${stamp(1)}.dump`,
    ])
    const left = (await store.list()).map((o) => o.name)
    expect(left).toHaveLength(all.length - 4)
    for (let day = 1; day <= 3; day++) {
      expect(left).toContain(`${other("cp_test_staging", day)}.dump`)
      expect(left).toContain(`${other("zz", day)}.json`)
    }
    expect(left).toContain("cp-cp_test-oops.dump")
  })

  it("lists nothing when the directory does not exist yet", async () => {
    expect(await diskBackupStore(join(dir, "missing")).list()).toEqual([])
  })

  it("rejects names that could leave the directory", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    await expect(store.put("../escape.dump", src)).rejects.toThrow(
      "Invalid backup file name"
    )
    await expect(store.download("a/b.dump", src)).rejects.toThrow(
      "Invalid backup file name"
    )
  })

  it("keeps the newest 14 dumps and deletes older dumps with their manifests", async () => {
    const store = diskBackupStore(join(dir, "backups"))
    for (let day = 1; day <= 16; day++) {
      await store.put(`${stamp(day)}.dump`, src)
      await store.put(`${stamp(day)}.json`, src)
    }
    expect(await pruneBackups(store, 14, "cp_test")).toEqual([
      `${stamp(2)}.dump`,
      `${stamp(1)}.dump`,
    ])
    const names = (await store.list()).map((o) => o.name)
    expect(names.filter((n) => n.endsWith(".dump"))).toHaveLength(14)
    expect(names).not.toContain(`${stamp(1)}.json`)
    expect(names).toContain(`${stamp(3)}.json`)
  })
})

describe("R2 backup store (R11-2: every key under cp/)", () => {
  const config = {
    accountId: "acc",
    jurisdiction: "default",
    bucket: "cp-media",
    accessKeyId: "key",
    secretAccessKey: "secret",
  } as R2Config
  const root = r2ObjectKey(config, BACKUP_PREFIX)

  type Sent = { name: string; input: Record<string, unknown> }
  const stub = (
    pages: (token: unknown) => Record<string, unknown>
  ): { sent: Sent[]; client: S3Client } => {
    const sent: Sent[] = []
    const send = vi.fn(async (command: { input: Record<string, unknown> }) => {
      const name = command.constructor.name
      sent.push({ name, input: command.input })
      if (name === "ListObjectsV2Command")
        return pages(command.input.ContinuationToken)
      if (name === "GetObjectCommand")
        return {
          Body: {
            transformToByteArray: async () =>
              new TextEncoder().encode("PGDMP-r2"),
          },
        }
      return {}
    })
    return { sent, client: { send } as unknown as S3Client }
  }
  const obj = (Key: string) => ({ Key, Size: 5, LastModified: new Date() })

  it("builds every key and the list prefix with r2ObjectKey (cp/backups/)", async () => {
    expect(root).toBe("cp/backups/")
    const { sent, client } = stub((token) =>
      token
        ? { Contents: [obj(`${root}${stamp(1)}.dump`)], IsTruncated: false }
        : {
            Contents: [
              obj(`${root}${stamp(2)}.dump`),
              obj(`${root}nested/x.dump`),
            ],
            IsTruncated: true,
            NextContinuationToken: "t2",
          }
    )
    const store = r2BackupStore(config, client)
    expect(store.location).toBe("r2://cp-media/cp/backups/")

    await store.put(`${stamp(2)}.dump`, src)
    expect(sent.at(-1)).toMatchObject({
      name: "PutObjectCommand",
      input: { Bucket: "cp-media", Key: `cp/backups/${stamp(2)}.dump` },
    })
    expect((await store.list()).map((o) => o.name)).toEqual([
      `${stamp(2)}.dump`,
      `${stamp(1)}.dump`,
    ])
    expect(sent.filter((s) => s.name === "ListObjectsV2Command")).toHaveLength(
      2
    )
    const out = join(dir, "r2.bin")
    await store.download(`${stamp(2)}.dump`, out)
    expect(await readFile(out, "utf8")).toBe("PGDMP-r2")
    await store.delete(`${stamp(1)}.dump`)
    expect(sent.at(-1)).toMatchObject({
      name: "DeleteObjectCommand",
      input: { Key: `cp/backups/${stamp(1)}.dump` },
    })
  })

  it("with a folder (keyPrefix) every key and the listing prefix live under cp/<folder>/backups/", async () => {
    const cfg = { ...config, keyPrefix: "site-a" } as R2Config
    const { sent, client } = stub(() => ({
      Contents: [obj(`cp/site-a/backups/${stamp(3)}.dump`)],
      IsTruncated: false,
    }))
    const store = r2BackupStore(cfg, client)
    expect(store.location).toBe("r2://cp-media/cp/site-a/backups/")
    await store.put(`${stamp(3)}.dump`, src)
    expect((await store.list()).map((o) => o.name)).toEqual([
      `${stamp(3)}.dump`,
    ])
    await store.download(`${stamp(3)}.dump`, join(dir, "o.bin"))
    await store.delete(`${stamp(3)}.dump`)
    expect(sent.map((s) => s.input.Key ?? s.input.Prefix)).toEqual([
      `cp/site-a/backups/${stamp(3)}.dump`,
      "cp/site-a/backups/",
      `cp/site-a/backups/${stamp(3)}.dump`,
      `cp/site-a/backups/${stamp(3)}.dump`,
    ])
  })

  it("prune ignores foreign keys and deletes exactly the 2 oldest of 16 dumps (+ manifests)", async () => {
    const own = Array.from({ length: 16 }, (_, i) => i + 1).flatMap((day) => [
      obj(`${root}${stamp(day)}.dump`),
      obj(`${root}${stamp(day)}.json`),
    ])
    const foreign = [
      "sp/backups/other-db-20261001T020000Z.dump",
      "sp/backups/other-db-20261001T020000Z.json",
      "backups/x.dump",
      "cp/media/x.dump",
      "cp/media/cp-cp_test-20261001T020000Z.dump",
      "cp/backups/../x",
      `cp/backups-old/${stamp(1)}.dump`,
    ].map(obj)
    const { sent, client } = stub(() => ({
      Contents: [...foreign, ...own],
      IsTruncated: false,
    }))
    const store = r2BackupStore(config, client)

    expect((await store.list()).map((o) => o.name)).not.toContain("x")
    expect((await store.list()).length).toBe(32)

    sent.length = 0
    const deleted = await pruneBackups(store, 14, "cp_test")
    expect(deleted).toEqual([`${stamp(2)}.dump`, `${stamp(1)}.dump`])
    const keys = sent
      .filter((s) => s.name === "DeleteObjectCommand")
      .map((s) => s.input.Key as string)
    expect(keys.sort()).toEqual(
      [1, 2].flatMap((d) => [
        `${root}${stamp(d)}.dump`,
        `${root}${stamp(d)}.json`,
      ])
    )
    for (const key of keys) expect(key.startsWith(root)).toBe(true)
    for (const s of sent.filter((x) => x.name === "ListObjectsV2Command"))
      expect(s.input.Prefix).toBe(root)
  })
})
