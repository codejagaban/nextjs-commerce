import { defineConfig, devices } from '@playwright/test'
import { testEnvironment } from './tests/environment.mjs'

Object.assign(process.env, testEnvironment())

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3002',
    extraHTTPHeaders: { Origin: 'http://localhost:3002' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: 'pnpm start --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 60000,
  },
})
