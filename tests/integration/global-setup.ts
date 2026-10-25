import { Client } from "pg"

import { runMigrations } from "@/server/db/migrate"

import { assertCpTestDatabase, TEST_DATABASE_URL } from "./db"

const redact = (url: string) => url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@")

/** Runs once per `vitest` invocation: fails loudly if Postgres is down, then migrates cp_test. */
export default async function globalSetup() {
  let guardName = ""
  const client = new Client({
    connectionString: TEST_DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  })
  try {
    await client.connect()
    const res = await client.query<{ name: string }>(
      "select current_database() as name"
    )
    guardName = res.rows[0].name
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Integration tests need Postgres at ${redact(TEST_DATABASE_URL)} (${cause}).\n` +
        "Start it with `pnpm db:up` (CI provides a postgres service). Unit tests only: `pnpm test:unit`."
    )
  } finally {
    await client.end().catch(() => undefined)
  }
  assertCpTestDatabase(guardName)
  await runMigrations(TEST_DATABASE_URL)
}
