import { CV_MAX_BYTES } from "./cv-dropzone"
import type { ApplyView } from "./types"

/**
 * The form's own copy for the fields a 422 rejected. The server's text is
 * never shown: the email gets the email copy, the CV its size or type copy,
 * any other answer the generic "not accepted" line.
 */
export function serverFieldErrors(
  keys: string[],
  errors: ApplyView["form"]["errors"],
  cvBytes: number
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of keys)
    out[key] =
      key === "email"
        ? errors.invalidEmail
        : key === "cv"
          ? cvBytes > CV_MAX_BYTES
            ? errors.cvSize
            : errors.cvType
          : errors.invalid
  return out
}
