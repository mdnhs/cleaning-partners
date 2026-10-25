import { describe, expect, it } from "vitest"

import { assertCpTestDatabase } from "../integration/db"

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
