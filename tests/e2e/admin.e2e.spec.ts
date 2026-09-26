import { expect, test } from '@playwright/test'

test('admin can access the dashboard, switch charts, and open settings', async ({ page }) => {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill('admin@commerce-test.example')
  await page.locator('#field-password').fill('CommerceTest123!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/admin')
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Line', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Bars', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bars', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const openMenu = page.getByRole('button', { name: 'Open Menu', exact: true })
  if (await openMenu.isVisible()) await openMenu.click()
  await page.getByRole('link', { name: 'Store settings', exact: true }).click()
  await expect(page).toHaveURL('/admin/globals/settings')
  await expect(page.getByLabel('Store Name', { exact: false })).toHaveValue('Marisol')
})

test('customer cannot enter the admin dashboard or read other users', async ({ page }) => {
  const login = await page.request.post('/api/users/login', {
    data: {
      email: 'customer@commerce-test.example',
      password: 'CommerceTest123!',
    },
  })
  expect(login.ok()).toBeTruthy()
  await page.goto('/admin')
  await expect(page.getByText(/Unauthorized/i).first()).toBeVisible()
  const users = await page.request.get('/api/users')
  const body = await users.json()
  expect(body.docs.map((user: { email: string }) => user.email)).toEqual([
    'customer@commerce-test.example',
  ])
})
