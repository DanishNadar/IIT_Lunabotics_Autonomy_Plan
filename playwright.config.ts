import { rmSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);

// Reset before the web server starts (globalSetup runs after it, too late for the file cache).
rmSync(".data/e2e-db.json", { force: true });

/**
 * E2E runs against a production build using an isolated local data file that is
 * recreated from the seed on every run.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATA_FILE: ".data/e2e-db.json", SESSION_SECRET: "e2e-test-secret-not-for-production", DEMO_ACCOUNTS: "true" },
  },
});
