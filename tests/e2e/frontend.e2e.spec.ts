import { expect, test } from '@playwright/test'

test('storefront loads and links to the catalogue', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Marisol/)
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/shop')
  await expect(page.getByRole('link', { name: /Test Vitamin C Serum/ }).first()).toBeVisible()
})

test('search finds products and recovers from an empty result', async ({ page }) => {
  await page.goto('/shop?q=Vitamin')
  await expect(page.getByRole('link', { name: /Test Vitamin C Serum/ }).first()).toBeVisible()
  await page.goto('/shop?q=no-such-product-12345')
  await expect(page.getByRole('heading', { name: /Nothing matches/ })).toBeVisible()
  await page.getByRole('link', { name: 'Clear search', exact: true }).click()
  await expect(page).toHaveURL('/shop')
  await expect(page.getByRole('link', { name: /Test Vitamin C Serum/ }).first()).toBeVisible()
})

test('selecting a size changes the price and persists the cart across refresh', async ({
  page,
}) => {
  await page.goto('/products/test-vitamin-c-serum')
  const main = page.getByRole('main')
  await page.getByRole('button', { name: '30ml', exact: true }).click()
  await expect(main.getByText('$25.00', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '60ml', exact: true }).click()
  await expect(main.getByText('$40.00', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Open cart, 1 items', includeHidden: true }),
  ).toHaveCount(1)
  await page.reload()
  await page.getByRole('button', { name: 'Open cart, 1 items' }).click()
  const cart = page.getByRole('dialog')
  await expect(cart.getByText('Test Vitamin C Serum')).toBeVisible()
  await cart.getByRole('button', { name: 'Increase item quantity' }).click()
  await expect(cart.getByText('$80.00', { exact: true })).toBeVisible()
  await cart.getByRole('button', { name: 'Remove cart item' }).click()
  await expect(cart.getByText(/Your cart is empty/i)).toBeVisible()
})

test('out-of-stock products cannot be added to the cart', async ({ page }) => {
  await page.goto('/products/test-sold-out-cream')
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeDisabled()
  await expect(page.getByText('Sold out', { exact: true }).last()).toBeVisible()
})

test('local media is optimized and an unknown CMS route returns 404', async ({ page, request }) => {
  await page.goto('/products/test-vitamin-c-serum')
  const image = page.getByRole('main').getByRole('img', { name: 'Test serum bottle' }).first()
  await expect(image).toBeVisible()
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0)
  const response = await request.get('/missing-cms-page-regression')
  expect(response.status()).toBe(404)
})

test('signup uses custom validation and logs the customer straight in', async ({ page }) => {
  await page.goto('/create-account')
  await expect(page.locator('form')).toHaveAttribute('novalidate', '')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByText('Please enter your email address.')).toBeVisible()
  const email = `signup-${Date.now()}@commerce-test.example`
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('CommerceTest123!')
  await page.getByLabel('Confirm password', { exact: true }).fill('CommerceTest123!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL(/\/account/)
  const me = await page.request.get('/api/users/me')
  expect((await me.json()).user.email).toBe(email)
  await page.reload()
  await expect(page.getByLabel('Email address')).toHaveValue(email)
})

test('login validates locally, authenticates, and logout ends the session', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Please enter your password.')).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('customer@commerce-test.example')
  await page.getByLabel('Password', { exact: true }).fill('CommerceTest123!')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL(/\/account/)
  await page.goto('/logout')
  await expect(page.getByRole('heading', { name: 'Logged out successfully.' })).toBeVisible()
  const me = await page.request.get('/api/users/me')
  expect((await me.json()).user).toBeNull()
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)
})

test('reset-password without a token offers recovery', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByText(/reset link is missing its token/)).toBeVisible()
  await page.getByRole('link', { name: 'Request a new link' }).click()
  await expect(page).toHaveURL('/forgot-password')
})

test('anonymous shoppers cannot open account data', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)
  const users = await page.request.get('/api/users')
  expect(users.status()).toBe(403)
})
