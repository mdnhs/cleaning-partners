import { describe, expect, it } from "vitest"

import { serverFieldErrors } from "@/components/careers/application-errors"
import type { ApplyView } from "@/components/careers/types"

const errors: ApplyView["form"]["errors"] = {
  required: "<required>",
  invalidEmail: "<invalidEmail>",
  invalid: "<invalid>",
  cvType: "<cvType>",
  cvSize: "<cvSize>",
  closed: "<closed>",
  rateLimited: "<rateLimited>",
  generic: "<generic>",
}

describe("serverFieldErrors", () => {
  it("maps each rejected field to the form's own copy", () => {
    expect(
      serverFieldErrors(["email", "rightToWork", "cv"], errors, 100)
    ).toEqual({
      email: "<invalidEmail>",
      rightToWork: "<invalid>",
      cv: "<cvType>",
    })
  })

  it("a CV over the size limit gets the size copy", () => {
    expect(serverFieldErrors(["cv"], errors, 6 * 1024 * 1024)).toEqual({
      cv: "<cvSize>",
    })
  })

  it("no keys, no errors", () => {
    expect(serverFieldErrors([], errors, 0)).toEqual({})
  })
})
