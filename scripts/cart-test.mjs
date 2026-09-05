// Drive the add-to-cart flow and screenshot the cart. Usage: node scripts/cart-test.mjs <out>
import { chromium } from '@playwright/test'

const out = process.argv[2] || 'cart.png'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light',
  deviceScaleFactor: 2,
})
const log = (m) => console.log('[cart-test]', m)

await page.goto('http://localhost:3000/products/gentle-foaming-cleanser', { waitUntil: 'load' })
await page.waitForTimeout(1500)

log('clicking add to cart')
await page.getByRole('button', { name: 'Add to cart' }).click()
await page.waitForTimeout(2500)

log('opening cart')
await page.getByRole('button', { name: /open cart/i }).first().click()
await page.waitForTimeout(1800)

await page.screenshot({ path: out })
log('screenshot -> ' + out)

// report cart state from the API too
const items = await page.evaluate(async () => {
  try {
    const r = await fetch('/api/carts?limit=1&depth=0&sort=-createdAt', { credentials: 'include' })
    const d = await r.json()
    return d?.docs?.[0]?.items?.length ?? 'no-cart'
  } catch (e) {
    return 'err:' + e.message
  }
})
log('latest cart items: ' + JSON.stringify(items))

await browser.close()
