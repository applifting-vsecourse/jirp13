import { defineConfig } from "@playwright/test"

// The app is expected to be running already (`pnpm dev`) — see CLAUDE.md.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3050",
    trace: "retain-on-failure",
  },
})
