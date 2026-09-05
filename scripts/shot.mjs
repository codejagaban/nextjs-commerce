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
// step-scroll so every lazy-loaded image is triggered and finishes
await page.evaluate(async () => {
  const vh = window.innerHeight
  const total = document.body.scrollHeight
  for (let y = 0; y < total; y += Math.floor(vh * 0.8)) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 350))
  }
  window.scrollTo(0, 0)
})
// wait for all <img> to report complete
await page
  .evaluate(
    () =>
      new Promise((resolve) => {
        const imgs = Array.from(document.images)
        let pending = imgs.filter((i) => !i.complete).length
        if (!pending) return resolve(true)
        imgs
          .filter((i) => !i.complete)
          .forEach((i) => {
            const done = () => {
              pending -= 1
              if (pending <= 0) resolve(true)
            }
            i.addEventListener('load', done)
            i.addEventListener('error', done)
          })
        setTimeout(() => resolve(true), 6000)
      }),
  )
  .catch(() => {})
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: (Number(height) || 0) === 0 })
await browser.close()
console.log('shot ->', out)
