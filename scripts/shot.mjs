// Usage: node scripts/shot.mjs <url> <outfile> [width] [height] [theme]
// theme: light | dark  (default light).  height 0 => full page.
import { chromium } from '@playwright/test'

const [, , url, out, width = '1440', height = '0', theme = 'light'] = process.argv
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <outfile> [width] [height] [theme]')
  process.exit(1)
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) || 900 },
  colorScheme: theme === 'dark' ? 'dark' : 'light',
  deviceScaleFactor: 2,
})
await page.goto(url, { waitUntil: 'load', timeout: 120000 })
// settle fonts/images/lazy content
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1500)
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)
await page.screenshot({ path: out, fullPage: (Number(height) || 0) === 0 })
await browser.close()
console.log('shot ->', out)
