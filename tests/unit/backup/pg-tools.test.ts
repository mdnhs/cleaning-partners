import { afterEach, describe, expect, it } from "vitest"

import { pgEnv, runPgTool, withDatabase } from "@/server/lib/backup/pg-tools"

const URL_WITH_PASSWORD =
  "postgres://backup:s3cr%40t@db.internal:5441/cp_prod?sslmode=require"

describe("pgEnv", () => {
  it("moves every connection part into libpq variables (password never on argv)", () => {
    const env = pgEnv(URL_WITH_PASSWORD, {
      PATH: "/usr/bin",
      PGPASSWORD: "stale",
    })
    expect(env).toMatchObject({
      PATH: "/usr/bin",
      PGHOST: "db.internal",
      PGPORT: "5441",
      PGUSER: "backup",
      PGPASSWORD: "s3cr@t",
      PGDATABASE: "cp_prod",
      PGSSLMODE: "require",
      PGCONNECT_TIMEOUT: "10",
    })
  })

  it("hands SSL certificate and options parameters to libpq verbatim", () => {
    const env = pgEnv(
      "postgres://cp@db.internal/cp_prod?sslmode=verify-full&sslrootcert=/certs/ca.pem&sslcert=/certs/c.pem&sslkey=/certs/c.key&options=-c%20statement_timeout%3D0",
      { PGOPTIONS: "stale" }
    )
    expect(env).toMatchObject({
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: "/certs/ca.pem",
      PGSSLCERT: "/certs/c.pem",
      PGSSLKEY: "/certs/c.key",
      PGOPTIONS: "-c statement_timeout=0",
      PGDATABASE: "cp_prod",
    })
  })

  it("drops inherited libpq variables the URL does not set", () => {
    const env = pgEnv("postgres://cp@127.0.0.1/cp_dev", {
      PGPASSWORD: "leaked",
      PGSSLMODE: "disable",
    })
    expect(env.PGPASSWORD).toBeUndefined()
    expect(env.PGSSLMODE).toBeUndefined()
  })
})

describe("withDatabase", () => {
  it("points the same server at another database", () => {
    expect(
      withDatabase(
        "postgres://cp:cp@127.0.0.1:5441/cp_test",
        "cp_test_restore_drill"
      )
    ).toBe("postgres://cp:cp@127.0.0.1:5441/cp_test_restore_drill")
  })
})

describe("runPgTool", () => {
  const savedPath = process.env.PATH
  afterEach(() => {
    process.env.PATH = savedPath
  })

  it("explains a missing client binary", async () => {
    process.env.PATH = "/nonexistent-cp-test"
    await expect(
      runPgTool("pg_dump", ["--version"], "postgres://cp@127.0.0.1/cp_test")
    ).rejects.toThrow(
      "pg_dump was not found on PATH: install the PostgreSQL 17 client tools"
    )
  })
})
