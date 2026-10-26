import "server-only"

import { type R2Config, r2Config } from "@/lib/schemas/integrations/r2"
import { createIntegrationIfAbsent } from "@/server/modules/integrations/service"

/**
 * Input-only variables (read by operator scripts, never by the app): the
 * container start saves Settings ▸ Integrations ▸ R2 from them once
 * (docs/runbook.md "R2 folder and bootstrap"). Empty counts as unset:
 * docker-compose.yml passes them as ${X:-}.
 */
export const R2_ENV = {
  accountId: "CP_R2_ACCOUNT_ID",
  accessKeyId: "CP_R2_ACCESS_KEY_ID",
  secretAccessKey: "CP_R2_SECRET_ACCESS_KEY",
  bucket: "CP_R2_BUCKET",
} as const
export const R2_PREFIX_ENV = "CP_R2_PREFIX"
/**
 * Optional sub-folder under the hard cp/ root (R11-2), used when CP_R2_PREFIX
 * is unset or empty: "" means keys sit directly under cp/.
 */
export const DEFAULT_R2_PREFIX = ""

const VAR_OF: Record<string, string> = {
  ...R2_ENV,
  keyPrefix: R2_PREFIX_ENV,
  jurisdiction: "jurisdiction",
}

type Env = Partial<Record<string, string | undefined>>

const value = (env: Env, name: string) => (env[name] ?? "").trim()

/**
 * The key folder from CP_R2_PREFIX ("" when unset). Every key already lives
 * under cp/, so a value starting with "cp" (which would give cp/cp/…) is
 * refused. Names the variable, never echoes the value.
 */
export function r2PrefixFromEnv(env: Env): string {
  const prefix = value(env, R2_PREFIX_ENV) || DEFAULT_R2_PREFIX
  if (prefix === "cp" || prefix.startsWith("cp/"))
    throw new Error(
      `invalid ${R2_PREFIX_ENV}: keys are already under cp/, so leave it unset or name a sub-folder (never cp)`
    )
  return prefix
}

/**
 * R2 settings from CP_R2_*; null when none of the four is set. Throws when
 * only some are set or a value is invalid — naming variables, never values.
 */
export function r2ConfigFromEnv(env: Env): R2Config | null {
  const entries = Object.entries(R2_ENV)
  const missing = entries.filter(([, name]) => value(env, name) === "")
  if (missing.length === entries.length) return null
  if (missing.length > 0)
    throw new Error(
      `missing ${missing
        .map(([, name]) => name)
        .sort()
        .join(", ")}`
    )
  const keyPrefix = r2PrefixFromEnv(env)
  const parsed = r2Config.safeParse({
    accountId: value(env, R2_ENV.accountId),
    jurisdiction: "default",
    bucket: value(env, R2_ENV.bucket),
    accessKeyId: value(env, R2_ENV.accessKeyId),
    secretAccessKey: value(env, R2_ENV.secretAccessKey),
    keyPrefix,
  })
  if (!parsed.success) {
    const names = new Set(
      parsed.error.issues.map((i) => VAR_OF[String(i.path[0])] ?? "?")
    )
    throw new Error(`invalid ${[...names].sort().join(", ")}`)
  }
  return parsed.data
}

/**
 * Saves integrations.r2 from CP_R2_* when it is not saved yet. "not-set":
 * no variables; "exists": settings were already saved (never overwritten).
 */
export async function bootstrapR2(
  env: Env
): Promise<"not-set" | "exists" | "saved"> {
  const config = r2ConfigFromEnv(env)
  if (!config) return "not-set"
  return (await createIntegrationIfAbsent(
    "integrations.r2",
    config,
    "r2-bootstrap"
  ))
    ? "saved"
    : "exists"
}
