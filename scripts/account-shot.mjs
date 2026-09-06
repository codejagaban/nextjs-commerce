// Log in as the seeded customer, then screenshot an account page.
// Usage: node scripts/account-shot.mjs <path> <out> [height]
import { chromium } from '@playwright/test'

const [, , path = '/account', out = 'account.png', height = '0'] = process.argv
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({
  viewport: { width: 1440, height: Number(height) || 900 },
  colorScheme: 'light',
  deviceScaleFactor: 2,
})
const log = (m) => console.log('[account-shot]', m)

await page.goto('http://localhost:3000/login', { waitUntil: 'load' })
await page.waitForTimeout(1200)
await page.locator('#email').fill('customer@example.com')
await page.locator('#password').fill('password')
await page.getByRole('button', { name: 'Log in' }).click()
await page.waitForTimeout(3500)
log('logged in, going to ' + path)
await page.goto('http://localhost:3000' + path, { waitUntil: 'load' })
await page.waitForTimeout(2500)
await page.screenshot({ path: out, fullPage: (Number(height) || 0) === 0 })
log('screenshot -> ' + out)
await browser.close()
