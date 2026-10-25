import { sql } from "drizzle-orm"

import { getDb } from "@/server/db/client"

/** cp_test from docker-compose.dev.yml; CI's postgres service uses the same URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://cp:cp@127.0.0.1:5434/cp_test"

/**
 * A URL the seed guard rejects as non-disposable (never connected to by the
 * guard tests; the host does not resolve).
 */
export const NON_DISPOSABLE_URL = "postgres://cp:cp@db.invalid:5439/cp_prod"

/** Only databases named cp_test / cp_<x>_test may be migrated or truncated. */
const CP_TEST_DB = /^cp_(.*_)?test$/

export function assertCpTestDatabase(name: string): void {
  if (!CP_TEST_DB.test(name))
    throw new Error(`Refusing to reset non-CP test database ${name}`)
}

/**
 * resetDb also serves the visual and E2E seeds (tests/e2e/seed.ts,
 * tests/visual/seed.ts), which truncate cp_e2e; those seeds additionally run
 * assertE2eDatabase (loopback host, *_e2e name) before connecting.
 */
export function assertCpResettableDatabase(name: string): void {
  if (name === "cp_e2e") return
  assertCpTestDatabase(name)
}

/** Truncates every table in the public schema (migration bookkeeping lives in the "drizzle" schema). */
export async function resetDb(): Promise<void> {
  const db = getDb()
  const current = await db.execute<{ name: string }>(
    sql`select current_database() as name`
  )
  assertCpResettableDatabase(current.rows[0].name)
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`
  )
  if (rows.length === 0) return
  const list = rows
    .map((r) => `"public"."${r.tablename.replaceAll('"', '""')}"`)
    .join(", ")
  await db.execute(sql.raw(`truncate table ${list} restart identity cascade`))
}
