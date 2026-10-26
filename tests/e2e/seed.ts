// Prepares cp_e2e for the admin E2E specs. Run by tests/e2e/global.setup.ts:
//   pnpm tsx:server tests/e2e/seed.ts   (env from tests/e2e/env.ts)
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { URI } from "otpauth"

import type { Role } from "@/lib/auth/roles"

import { getAuth } from "@/server/auth/auth"
import {
  createPasswordToken,
  INVITE_TOKEN_EXPIRES_IN,
  passwordUrl,
} from "@/server/auth/tokens"
import { closeDb, getDb } from "@/server/db/client"
import { runMigrations } from "@/server/db/migrate"
import { seedContent } from "@/server/db/seed"
import { getEnv } from "@/server/env"

import { resetDb } from "../integration/db"

import { E2E_ADMIN, E2E_OWNER } from "./admin-accounts"
import { assertE2eDatabase } from "./env"
import { E2E_PASSWORD, type E2EFixtures, FIXTURES_FILE } from "./fixtures"

const { DATABASE_URL } = getEnv()
assertE2eDatabase(DATABASE_URL)

await runMigrations(DATABASE_URL)
await resetDb()
// The public site reads its content from the database.
await seedContent(getDb())
const auth = getAuth()

const owner = { ...E2E_OWNER }
await auth.api.createUser({
  body: { ...owner, role: ["owner"], password: E2E_PASSWORD },
})

// Plain admin for the Users screen's owner-only checks (users-audit.spec).
await auth.api.createUser({
  body: { ...E2E_ADMIN, role: ["admin"], password: E2E_PASSWORD },
})

const editor = { email: "editor@e2e.test", name: "Edith Editor" }
await auth.api.createUser({
  body: { ...editor, role: ["editor"], password: E2E_PASSWORD },
})

const invitee = { email: "invitee@e2e.test", name: "Ivy Invitee" }
const { user: invited } = await auth.api.createUser({
  body: { ...invitee, role: ["viewer"] },
})
const inviteUrl = passwordUrl(
  "set-password",
  await createPasswordToken(invited.id, INVITE_TOKEN_EXPIRES_IN)
)

/** Creates a user with a password, turns TOTP on, returns the otpauth URI. */
async function enrolTotp(
  person: { email: string; name: string },
  roles: Role[]
): Promise<string> {
  await auth.api.createUser({
    body: { ...person, role: roles, password: E2E_PASSWORD },
  })
  const signedIn = await auth.api.signInEmail({
    body: { email: person.email, password: E2E_PASSWORD },
    returnHeaders: true,
  })
  const headers = new Headers({
    cookie: signedIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  })
  const enabled = await auth.api.enableTwoFactor({
    body: { password: E2E_PASSWORD },
    headers,
  })
  if (enabled.method !== "totp") throw new Error("expected a TOTP enrolment")
  await auth.api.verifyTOTP({
    body: { code: URI.parse(enabled.totpURI).generate() },
    headers,
  })
  return enabled.totpURI
}

// Two-factor user: sign in, enable TOTP, confirm with a generated code.
const twoFactor = { email: "twofactor@e2e.test", name: "Tess Twofactor" }
const twoFactorUri = await enrolTotp(twoFactor, ["admin"])

// Account page user (Task 2.6): turns 2FA on through the UI.
const account = { email: "account@e2e.test", name: "Avery Account" }
await auth.api.createUser({
  body: { ...account, role: ["editor"], password: E2E_PASSWORD },
})

// account.spec turns 2FA off for this one.
const twoFactorOff = { email: "twofactor-off@e2e.test", name: "Toby Twofactor" }
const twoFactorOffUri = await enrolTotp(twoFactorOff, ["editor"])

// Articles workflow (Phase 5): an author who drafts and submits.
const author = { email: "author@e2e.test", name: "Arthur Author" }
await auth.api.createUser({
  body: { ...author, role: ["author"], password: E2E_PASSWORD },
})

// Later phases add the intake, demo and reset users.

const fixtures: E2EFixtures = {
  owner,
  editor,
  invitee: { ...invitee, inviteUrl },
  twoFactor: { ...twoFactor, totpUri: twoFactorUri },
  account,
  author,
  twoFactorOff: { ...twoFactorOff, totpUri: twoFactorOffUri },
}
mkdirSync(dirname(FIXTURES_FILE), { recursive: true })
writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2))
await closeDb()
console.log("[e2e] cp_e2e migrated and seeded")
