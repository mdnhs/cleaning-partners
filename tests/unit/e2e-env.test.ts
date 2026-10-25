import { describe, expect, it } from "vitest"

import { assertE2eDatabase, E2E_ENV, PORT, SERVER_ENV } from "../e2e/env"

import { E2E_ENV as ENV_ } from "../e2e/env"

describe("E2E defaults (R2-4)", () => {
  it("point at cp_e2e on 5434 and serve on 3200", () => {
    if (!process.env.E2E_DATABASE_URL)
      expect(ENV_.DATABASE_URL).toBe("postgres://cp:cp@127.0.0.1:5434/cp_e2e")
    if (!process.env.PW_PORT) expect(PORT).toBe(3200)
  })
})

describe("E2E database guard (ledger P03-9: one guard for visual and E2E seeds)", () => {
  it("accepts the local E2E database", () => {
    expect(() => assertE2eDatabase(E2E_ENV.DATABASE_URL)).not.toThrow()
    expect(() =>
      assertE2eDatabase("postgres://cp:cp@localhost:5434/ci_e2e")
    ).not.toThrow()
  })

  it.each([
    "postgres://cp:cp@127.0.0.1:5434/cp_dev",
    "postgres://cp:cp@db.example.ie:5434/cp_e2e",
    "postgres://cp:cp@127.0.0.1:5434/cp_e2e_backup",
    "not a url",
  ])("refuses %s", (url) => {
    expect(() => assertE2eDatabase(url)).toThrow("Refusing to reset")
  })

  it("serves the standalone server on loopback at the E2E port", () => {
    expect(SERVER_ENV).toEqual({
      ...E2E_ENV,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
    })
  })
})
