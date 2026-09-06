// Functional smoke test of the auth/account flows.
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3002'
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const log = (m) => console.log('•', m)
const fail = (m) => console.log('✗ FAIL:', m)
const ok = (m) => console.log('✓', m)

async function goto(p) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
}

try {
  // 1. LOGIN
  await goto('/login')
  await page.locator('#email').fill('customer@example.com')
  await page.locator('#password').fill('password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForTimeout(3000)
  if (page.url().includes('/login')) fail('login did not redirect (still on /login)')
  else ok('login redirected to ' + page.url().replace(BASE, ''))

  // 2. ACCOUNT UPDATE — toggle name and submit
  await goto('/account')
  const nameField = page.locator('#name')
  const original = await nameField.inputValue()
  const testName = original === 'Customer' ? 'Customer Test' : 'Customer'
  await nameField.fill(testName)
  const updateBtn = page.getByRole('button', { name: /Update account/i })
  const disabledBefore = await updateBtn.isDisabled()
  log('update button disabled before edit-blur? ' + disabledBefore)
  await updateBtn.click()
  await page.waitForTimeout(2500)
  // reload and check persisted
  await goto('/account')
  const persisted = await page.locator('#name').inputValue()
  if (persisted === testName) ok('account name update persisted -> "' + persisted + '"')
  else fail('account name did NOT persist (got "' + persisted + '", wanted "' + testName + '")')
  // revert
  await page.locator('#name').fill(original)
  await page.getByRole('button', { name: /Update account/i }).click()
  await page.waitForTimeout(1500)
  log('reverted name to "' + original + '"')

  // 3. ADD ADDRESS
  await goto('/account/addresses')
  await page.getByRole('button', { name: 'Add a new address' }).click()
  await page.waitForTimeout(800)
  const dialog = page.getByRole('dialog')
  if (!(await dialog.isVisible())) fail('add-address dialog did not open')
  else {
    ok('add-address dialog opened')
    // fill whatever fields exist
    const fillIf = async (sel, val) => {
      const el = dialog.locator(sel)
      if (await el.count()) await el.first().fill(val)
    }
    await fillIf('#firstName', 'Test')
    await fillIf('#lastName', 'Buyer')
    await fillIf('#addressLine1', '12 Rosewater Lane')
    await fillIf('#city', 'Portland')
    await fillIf('#state', 'OR')
    await fillIf('#postalCode', '97201')
    await fillIf('#phone', '5035551234')
    // country is a Radix Select trigger, not a native select
    const countryTrigger = dialog.locator('#country')
    if (await countryTrigger.count()) {
      await countryTrigger.click()
      await page.waitForTimeout(400)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(300)
    }
    const submit = dialog.getByRole('button', { name: 'Submit' })
    await submit.click()
    await page.waitForTimeout(2500)
    await goto('/account/addresses')
    const body = await page.locator('body').innerText()
    if (body.includes('Rosewater') || body.includes('Test Buyer')) ok('new address appears in listing')
    else fail('new address not found in listing after save')
  }

  // 4. LOGOUT
  await goto('/account')
  await page.getByRole('link', { name: 'Log out' }).click()
  await page.waitForTimeout(2500)
  await goto('/account')
  await page.waitForTimeout(1500)
  if (page.url().includes('/login')) ok('logout worked (account now redirects to login)')
  else fail('still authenticated after logout (account did not redirect)')

  // 5. FORGOT PASSWORD submit
  await goto('/forgot-password')
  await page.locator('#email').fill('customer@example.com')
  await page.getByRole('button').filter({ hasText: /reset|send|email/i }).first().click()
  await page.waitForTimeout(2500)
  const fpText = await page.locator('body').innerText()
  ok('forgot-password submitted (page shows: "' + fpText.slice(0, 60).replace(/\n/g, ' ') + '...")')

} catch (e) {
  fail('exception: ' + e.message)
} finally {
  await browser.close()
}
