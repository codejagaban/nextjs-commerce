import { defineConfig, devices } from '@playwright/test'
import { smokeConfig } from './tests/smoke/config'

const { baseURL } = smokeConfig()

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: '**/*.smoke.spec.ts',
  forbidOnly: true,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never', outputFolder: 'playwright-smoke-report' }],
  ],
  outputDir: 'smoke-test-results',
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    // Traces include admin credentials, auth cookies, reset tokens and payment secrets.
    trace: 'off',
    video: 'off',
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL as 'chrome' }
      : {}),
  },
})
