import { describe, expect, it } from "vitest"

import {
  assertCpResettableDatabase,
  assertCpTestDatabase,
} from "../integration/db"

describe("assertCpTestDatabase", () => {
  it("passes cp_test and cp_<x>_test", () => {
    expect(() => assertCpTestDatabase("cp_test")).not.toThrow()
    expect(() => assertCpTestDatabase("cp_e2e_test")).not.toThrow()
  })

  it.each(["sp_test", "postgres", "cp_dev", "cp_test_old"])(
    "refuses %s",
    (name) => {
      expect(() => assertCpTestDatabase(name)).toThrow(
        `Refusing to reset non-CP test database ${name}`
      )
    }
  )
})

describe("assertCpResettableDatabase (seeds)", () => {
  it("adds cp_e2e to the test databases", () => {
    expect(() => assertCpResettableDatabase("cp_e2e")).not.toThrow()
    expect(() => assertCpResettableDatabase("cp_test")).not.toThrow()
  })

  it.each(["cp_dev", "cp_e2e_copy", "postgres", "cp_e2e_old"])(
    "refuses %s",
    (name) => {
      expect(() => assertCpResettableDatabase(name)).toThrow(
        "Refusing to reset non-CP test database"
      )
    }
  )
})
