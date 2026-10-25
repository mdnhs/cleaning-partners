import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PW_PORT ?? 3200)

export default defineConfig({
  testDir: "tests",
  testMatch: ["visual/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  snapshotPathTemplate:
    "{testDir}/visual/__screenshots__/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    // Full Chromium (new headless), not the separate headless shell.
    channel: "chromium",
    baseURL: `http://127.0.0.1:${PORT}`,
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Ruling C: `next start` refuses output: standalone, so run the standalone server.
    command:
      "pnpm build && node scripts/prepare-standalone.mjs && node .next/standalone/server.js",
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
})
