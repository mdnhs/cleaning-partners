import { describe, expect, it } from "vitest"

import {
  assertDisposable,
  describeDatabase,
  isDisposableDatabase,
} from "@/server/db/seed/guard"

describe("seed guard (spec §14)", () => {
  it.each([
    "postgres://cp:cp@db.internal:5434/cp_dev",
    "postgres://cp:cp@db.internal:5434/cp_test",
    "postgres://cp:cp@db.internal:5434/cleaning_e2e",
    "postgres://cp:cp@localhost:5434/cleaning",
    "postgres://cp:cp@127.0.0.1:5434/anything",
    "postgres://cp:cp@[::1]:5434/anything",
  ])("treats %s as disposable", (url) => {
    expect(isDisposableDatabase(url)).toBe(true)
    expect(() => assertDisposable(url, false)).not.toThrow()
  })

  it.each([
    "postgres://cp:secret@db.example.com:5434/cleaning",
    "postgres://cp:secret@10.0.0.5:5434/cp_development",
    "postgres://cp:secret@db.example.com:5434/test_prod",
    "not a url",
    // pg's ?host= overrides the URL authority (TCP host or socket path)
    "postgres://cp:x@localhost:5434/cleaning?host=db.example.com",
    "postgres://cp:x@localhost/cleaning?host=/cloudsql/proj:eu:inst",
    // hostaddr bypasses name resolution of the (local-looking) host
    "postgres://cp:x@localhost:5434/cp_dev?hostaddr=10.0.0.5",
    // malformed percent-encoding
    "postgres://h/cp%zz_dev",
  ])("refuses %s without --allow-production", (url) => {
    expect(isDisposableDatabase(url)).toBe(false)
    expect(() => assertDisposable(url, false)).toThrow("--allow-production")
  })

  it("never echoes credentials", () => {
    let message = ""
    try {
      assertDisposable(
        "postgres://cp:supersecret@db.example.com:5434/cleaning",
        false
      )
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toContain("db.example.com:5434/cleaning")
    expect(message).not.toContain("supersecret")
    expect(describeDatabase("postgres://u:p@h:1/d")).toBe("h:1/d")
  })

  it("describes the effective target pg would connect to", () => {
    expect(
      describeDatabase(
        "postgres://cp:x@localhost:5434/cleaning?host=db.example.com"
      )
    ).toBe("db.example.com:5434/cleaning")
    expect(describeDatabase("not a url")).toBe("an unparseable DATABASE_URL")
  })

  it("--allow-production bypasses the check", () => {
    expect(() =>
      assertDisposable(
        "postgres://cp:secret@db.example.com:5434/cleaning",
        true
      )
    ).not.toThrow()
  })
})
