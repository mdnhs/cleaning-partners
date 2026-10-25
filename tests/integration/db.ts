import { sql } from "drizzle-orm"

import { getDb } from "@/server/db/client"

/** cp_test from docker-compose.dev.yml; CI's postgres service uses the same URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://cp:cp@127.0.0.1:5434/cp_test"

/** Only databases named cp_test / cp_<x>_test may be migrated or truncated. */
const CP_TEST_DB = /^cp_(.*_)?test$/

export function assertCpTestDatabase(name: string): void {
  if (!CP_TEST_DB.test(name))
    throw new Error(`Refusing to reset non-CP test database ${name}`)
}

/** Truncates every table in the public schema (migration bookkeeping lives in the "drizzle" schema). */
export async function resetDb(): Promise<void> {
  const db = getDb()
  const current = await db.execute<{ name: string }>(
    sql`select current_database() as name`
  )
  assertCpTestDatabase(current.rows[0].name)
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`
  )
  if (rows.length === 0) return
  const list = rows
    .map((r) => `"public"."${r.tablename.replaceAll('"', '""')}"`)
    .join(", ")
  await db.execute(sql.raw(`truncate table ${list} restart identity cascade`))
}
