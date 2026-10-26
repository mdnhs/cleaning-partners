import { type ChildProcess, spawn } from "node:child_process"
import { createServer } from "node:net"

import { expect, test } from "@playwright/test"

import { SERVER_ENV } from "./env"

// The public error boundary (app/(site)/error.tsx): with the database
// unreachable a page renders the site-styled "Something went wrong" UI,
// never a stack trace. A second standalone server (the one the webServer
// just built) runs here with a DATABASE_URL nothing listens on.
const PORT = 3299
let server: ChildProcess | undefined

const portIsFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const probe = createServer()
    probe.once("error", () => resolve(false))
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)))
  })

test.beforeAll(async () => {
  if (!(await portIsFree(PORT)))
    throw new Error(`port ${PORT} is already in use; stop what holds it`)
  let stderr = ""
  let exited: string | undefined
  server = spawn("node", [".next/standalone/server.js"], {
    env: {
      ...process.env,
      ...SERVER_ENV,
      PORT: String(PORT),
      DATABASE_URL: "postgres://cp:cp@127.0.0.1:1/cp_down",
    },
    stdio: ["ignore", "ignore", "pipe"],
  })
  server.stderr?.on("data", (chunk) => {
    stderr = (stderr + String(chunk)).slice(-4000)
  })
  server.once("exit", (code, signal) => {
    exited = `code ${code}, signal ${signal}`
  })
  const deadline = Date.now() + 30_000
  for (;;) {
    if (exited)
      throw new Error(`down-DB server exited early (${exited}): ${stderr}`)
    try {
      await fetch(`http://127.0.0.1:${PORT}/api/v1/health`, {
        signal: AbortSignal.timeout(2_000),
      })
      return
    } catch {
      if (Date.now() > deadline)
        throw new Error(`down-DB server never started: ${stderr}`)
      await new Promise((r) => setTimeout(r, 250))
    }
  }
})

test.afterAll(() => {
  server?.kill()
})

test("a database outage renders the site-styled error page, no stack trace", async ({
  page,
}) => {
  await page.goto(`http://127.0.0.1:${PORT}/about`, {
    waitUntil: "load",
  })
  await expect(
    page.getByRole("heading", { name: "Something went wrong" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  await expect(page.locator("[data-hero]")).toBeVisible()
  const text = await page.locator("body").innerText()
  expect(text).not.toMatch(/ECONNREFUSED|at \w+.*\(.*:\d+:\d+\)|postgres:\/\//)
})
