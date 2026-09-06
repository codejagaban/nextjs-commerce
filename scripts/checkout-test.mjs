// Add to cart, then go to checkout and screenshot. Usage: node scripts/checkout-test.mjs <out>
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3002'

const out = process.argv[2] || 'checkout.png'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  colorScheme: 'light',
  deviceScaleFactor: 2,
})
const log = (m) => console.log('[checkout-test]', m)

await page.goto(BASE + '/products/hydrating-day-moisturiser', { waitUntil: 'load' })
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Add to cart' }).click()
await page.waitForTimeout(2500)
log('going to /checkout')
await page.goto(BASE + '/checkout', { waitUntil: 'load' })
await page.waitForTimeout(4500)
await page.screenshot({ path: out, fullPage: true })
log('screenshot -> ' + out)
await browser.close()
