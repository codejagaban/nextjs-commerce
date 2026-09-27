import { defineConfig, devices } from '@playwright/test'

const required = [
  'SMOKE_BASE_URL',
  'SMOKE_ADMIN_EMAIL',
  'SMOKE_ADMIN_PASSWORD',
  'SMOKE_CUSTOMER_EMAIL',
  'SMOKE_STRIPE_SECRET_KEY',
] as const

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required for the production smoke test.`)
}

const baseURL = new URL(process.env.SMOKE_BASE_URL!)
const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname)

if (baseURL.protocol !== 'https:' && !(isLoopback && process.env.SMOKE_ALLOW_LOCALHOST === '1')) {
  throw new Error(
    'SMOKE_BASE_URL must use HTTPS. Set SMOKE_ALLOW_LOCALHOST=1 only for local rehearsal.',
  )
}

if (!process.env.SMOKE_STRIPE_SECRET_KEY!.startsWith('sk_test_')) {
  throw new Error('The production smoke test refuses to run with a live Stripe secret key.')
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.SMOKE_CUSTOMER_EMAIL!)) {
  throw new Error('SMOKE_CUSTOMER_EMAIL must be a valid mailbox address that supports + aliases.')
}

export default defineConfig({
  testDir: './tests/smoke',
  forbidOnly: true,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-smoke-report' }]],
  use: {
    baseURL: baseURL.origin,
    extraHTTPHeaders: { Origin: baseURL.origin },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL as 'chrome' }
      : {}),
  },
})
