import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('staff review refunds and receive physical returns with explicit restocking', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.request.post('/api/users/login', {
    data: { email: 'admin@commerce-test.example', password: 'CommerceTest123!' },
  })
  const productResponse = await page.request.post('/api/products', {
    data: {
      title: 'Return browser product',
      slug: `return-browser-${randomUUID()}`,
      _status: 'published',
      inventory: 8,
      priceInUSDEnabled: true,
      priceInUSD: 2500,
    },
  })
  expect(productResponse.ok()).toBeTruthy()
  const product = (await productResponse.json()).doc
  let order: { id: number; workflowVersion: number; items: { id: string }[] } | undefined
  let transactionID: number | undefined
  try {
    const response = await page.request.post('/api/orders', {
      data: {
        customerEmail: 'return-browser@example.com',
        currency: 'USD',
        amount: 5000,
        subtotal: 5000,
        items: [{ product: product.id, quantity: 2 }],
      },
    })
    expect(response.ok()).toBeTruthy()
    order = (await response.json()).doc
    const payment = await page.request.post('/api/transactions', {
      data: {
        order: order!.id,
        amount: 5000,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: 'stripe',
        stripe: { paymentIntentID: `pi_browser_${randomUUID()}` },
      },
    })
    expect(payment.ok()).toBeTruthy()
    transactionID = (await payment.json()).doc.id
    await page.goto(`/admin/collections/orders/${order!.id}`)
    const panel = page.getByRole('region', { name: 'Refunds and returns', exact: true })
    await expect(panel.getByRole('button', { name: 'Issue refund', exact: true })).toBeEnabled()
    await panel.getByRole('button', { name: 'Issue refund', exact: true }).click()
    await panel.getByRole('button', { name: 'Review refund', exact: true }).click()
    await expect(panel.getByText('Enter a reason.', { exact: true })).toBeVisible()
    await panel.getByLabel('Refund productAmount', { exact: true }).fill('50.01')
    await panel.getByLabel('Refund or return reason', { exact: true }).fill('Customer requested')
    await panel.getByRole('button', { name: 'Review refund', exact: true }).click()
    await expect(
      panel.getByText('Enter a valid amount within the remaining balance.', { exact: true }),
    ).toBeVisible()
    await panel.getByLabel('Refund productAmount', { exact: true }).fill('25.00')
    await panel.getByRole('button', { name: 'Review refund', exact: true }).click()
    await expect(panel.getByRole('group', { name: 'Confirm refund', exact: true })).toContainText(
      '$25.00',
    )
    // Provider transport and successful/failed money movement are covered by integration tests.
    // Never send a fabricated PaymentIntent to Stripe from this production browser fixture.
    await panel.getByRole('button', { name: 'Review amounts', exact: true }).click()
    await panel.getByRole('button', { name: 'Review refund', exact: true }).click()
    let submitted: Record<string, unknown> | undefined
    await page.route(`**/api/orders/${order!.id}/refunds`, async (route) => {
      submitted = route.request().postDataJSON()
      await route.fulfill({
        status: 409,
        json: { message: 'Refund test transport rejected the request.' },
      })
    })
    await panel.getByRole('button', { name: 'Confirm refund', exact: true }).click()
    await expect(panel.getByRole('alert')).toHaveText('Refund test transport rejected the request.')
    expect(submitted).toMatchObject({
      productAmount: 2500,
      shippingAmount: 0,
      taxAmount: 0,
      reason: 'Customer requested',
    })
    await page.unroute(`**/api/orders/${order!.id}/refunds`)
    await panel.getByRole('button', { name: 'Issue refund', exact: true }).click()
    await panel.getByRole('button', { name: 'Close editor', exact: true }).click()
    const fresh = await page.request.get(`/api/orders/${order!.id}?depth=0`)
    const current = await fresh.json()
    const ship = await page.request.post(`/api/orders/${order!.id}/workflow`, {
      data: {
        requestID: randomUUID(),
        version: current.workflowVersion,
        action: 'ship',
        carrier: 'Test carrier',
        notifyCustomer: false,
        items: [{ orderItemID: current.items[0].id, quantity: 2 }],
      },
    })
    expect(ship.ok()).toBeTruthy()
    await page.reload()
    await panel.getByRole('button', { name: 'Create return', exact: true }).click()
    await panel.getByLabel('Refund or return reason', { exact: true }).fill('Wrong size')
    await panel.getByRole('spinbutton', { name: /Return quantity/ }).fill('2')
    await panel.getByRole('button', { name: 'Save return request', exact: true }).click()
    await expect(panel.getByRole('heading', { name: 'Return 1', exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Receive return 1', exact: true }).click()
    await panel.getByRole('spinbutton', { name: /Return quantity/ }).fill('1')
    await panel.getByRole('checkbox', { name: /Restock/ }).check()
    await panel.getByRole('button', { name: 'Confirm received goods', exact: true }).click()
    await expect(panel.getByText(/1\/2 received, 1 restocked/)).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: testInfo.outputPath('return-light.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await page
      .context()
      .addCookies([{ name: 'payload-theme', value: 'dark', url: 'http://localhost:3002' }])
    await page.reload()
    await expect(panel.getByRole('heading', { name: 'Return 1', exact: true })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: testInfo.outputPath('return-dark.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.custom-admin-nav')).not.toHaveClass(/custom-admin-nav--open/)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: testInfo.outputPath('return-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    await panel.getByRole('button', { name: 'Receive return 1', exact: true }).click()
    await panel.getByRole('spinbutton', { name: /Return quantity/ }).fill('1')
    await panel.getByRole('button', { name: 'Confirm received goods', exact: true }).click()
    await expect(panel.getByText(/2\/2 received, 1 restocked/)).toBeVisible()
    expect(
      (await (await page.request.get(`/api/products/${product.id}?depth=0`)).json()).inventory,
    ).toBe(9)
    expect(
      (await (await page.request.get(`/api/orders/${order!.id}?depth=0`)).json()).paymentStatus,
    ).toBe('paid')
    await page.request.post('/api/users/logout')
    await page.goto(
      `/orders/${order!.id}?email=return-browser%40example.com&accessToken=${current.accessToken}`,
    )
    await expect(page.getByRole('heading', { name: 'Return 1', exact: true })).toBeVisible()
    await expect(page.getByText(/2 of 2 received/)).toBeVisible()
  } finally {
    await page.request.post('/api/users/login', {
      data: { email: 'admin@commerce-test.example', password: 'CommerceTest123!' },
    })
    // Remove only records created by this run, using the authorized admin fixture.
    if (order) await page.request.delete(`/api/orders/${order.id}`)
    if (transactionID) await page.request.delete(`/api/transactions/${transactionID}`)
    await page.request.delete(`/api/products/${product.id}`)
  }
})
