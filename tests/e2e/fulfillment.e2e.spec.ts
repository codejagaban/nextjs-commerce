import { expect, test } from '@playwright/test'

test('admin ships quantities, updates tracking, records delivery and the customer sees it', async ({
  page,
}, testInfo) => {
  const login = await page.request.post('/api/users/login', {
    data: { email: 'admin@commerce-test.example', password: 'CommerceTest123!' },
  })
  expect(login.ok()).toBeTruthy()
  const response = await page.request.get(
    '/api/orders?where[customerEmail][equals]=fulfillment-browser@commerce-test.example&depth=0',
  )
  const order = (await response.json()).docs[0]
  await page.goto(`/admin/collections/orders/${order.id}`)
  const panel = page.getByRole('region', { name: 'Order workflow', exact: true })
  await expect(panel.getByText('Paid', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  await panel.getByRole('button', { name: 'Start preparing', exact: true }).click()
  await expect(panel.getByText('Preparing', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Create shipment', exact: true }).click()
  await panel.getByRole('button', { name: 'Dispatch shipment', exact: true }).click()
  await expect(panel.getByText('Enter a carrier.', { exact: true })).toBeVisible()
  await panel.getByLabel('Carrier', { exact: true }).fill('Royal Mail')
  await panel.getByRole('spinbutton', { name: /Ship quantity/ }).fill('1')
  await panel.getByLabel('Tracking number', { exact: false }).fill('TEST-TRACK-ONE')
  await panel
    .getByLabel('Tracking link', { exact: false })
    .fill('https://tracking.example.com/TEST-TRACK-ONE')
  await panel.getByLabel('Email the customer about this update').uncheck()
  await panel.getByRole('button', { name: 'Dispatch shipment', exact: true }).click()
  await expect(panel.getByText('Partially fulfilled', { exact: true })).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Track shipment', exact: true })).toHaveAttribute(
    'href',
    'https://tracking.example.com/TEST-TRACK-ONE',
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('fulfillment-light.png'), fullPage: true })
  await page
    .context()
    .addCookies([{ name: 'payload-theme', value: 'dark', url: 'http://localhost:3002' }])
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(panel.getByRole('button', { name: 'Create shipment', exact: true })).toBeEnabled()
  await page.screenshot({
    path: testInfo.outputPath('fulfillment-dark.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('fulfillment-mobile.png'), fullPage: true })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.setViewportSize({ width: 1280, height: 900 })
  await panel.getByRole('button', { name: 'Edit tracking', exact: true }).click()
  await panel.getByLabel('Tracking number', { exact: false }).fill('TEST-TRACK-UPDATED')
  await panel.getByLabel('Email the customer about this update').uncheck()
  await panel.getByRole('button', { name: 'Save tracking', exact: true }).click()
  await expect(panel.getByText(/TEST-TRACK-UPDATED/)).toBeVisible()
  await panel.getByRole('button', { name: 'Create shipment', exact: true }).click()
  await panel.getByLabel('Carrier', { exact: true }).fill('Royal Mail')
  await panel.getByLabel('Email the customer about this update').uncheck()
  await panel.getByRole('button', { name: 'Dispatch shipment', exact: true }).click()
  await expect(panel.locator('article')).toHaveCount(2)
  await panel.getByRole('button', { name: 'Mark delivered', exact: true }).first().click()
  await expect(panel.getByRole('button', { name: 'Mark delivered', exact: true })).toHaveCount(1)
  await panel.getByRole('button', { name: 'Retry email', exact: true }).click()
  await expect(panel.getByRole('alert')).toContainText('Email could not be sent')
  await panel.getByRole('button', { name: 'Mark delivered', exact: true }).click()
  await panel.getByRole('button', { name: 'Complete order', exact: true }).click()
  await expect(panel.getByText('Completed', { exact: true })).toBeVisible()
  await panel.getByText(/Activity \(/).click()
  await expect(panel.getByText('Order completed', { exact: true })).toBeVisible()

  await page.request.post('/api/users/logout')
  await page.request.post('/api/users/login', {
    data: { email: 'customer@commerce-test.example', password: 'CommerceTest123!' },
  })
  const forbidden = await page.request.post(`/api/orders/${order.id}/workflow`, {
    data: { action: 'cancel' },
  })
  expect(forbidden.status()).toBe(403)
  await page.goto(`/orders/${order.id}`)
  await expect(page.getByRole('heading', { name: 'Order progress', exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Shipment 1: Delivered', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/TEST-TRACK-UPDATED/)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('customer-tracking.png'), fullPage: true })
})

test('cancelling a paid unshipped order restores inventory once and keeps payment recorded', async ({
  page,
}) => {
  const login = await page.request.post('/api/users/login', {
    data: { email: 'admin@commerce-test.example', password: 'CommerceTest123!' },
  })
  expect(login.ok()).toBeTruthy()
  const fixtures: { collection: string; id: number }[] = []
  const create = async (collection: string, data: Record<string, unknown>) => {
    const response = await page.request.post(`/api/${collection}`, { data })
    expect(response.ok()).toBeTruthy()
    const doc = (await response.json()).doc as { id: number }
    fixtures.push({ collection, id: doc.id })
    return doc
  }
  try {
    // Eight units represent stock after this synthetic paid order sold two.
    const product = await create('products', {
      title: 'Cancellation test cleanser',
      slug: `cancel-${crypto.randomUUID()}`,
      _status: 'published',
      priceInUSDEnabled: true,
      priceInUSD: 1000,
      inventory: 8,
    })
    const items = [{ product: product.id, quantity: 2 }]
    const order = await create('orders', {
      customerEmail: 'cancel-browser@commerce-test.example',
      amount: 2000,
      currency: 'USD',
      items,
    })
    const transaction = await create('transactions', {
      order: order.id,
      amount: 2000,
      currency: 'USD',
      paymentMethod: 'stripe',
      status: 'succeeded',
      items,
    })
    expect(
      (
        await page.request.patch(`/api/orders/${order.id}`, {
          data: { transactions: [transaction.id] },
        })
      ).ok(),
    ).toBeTruthy()
    await page.goto(`/admin/collections/orders/${order.id}`)
    const panel = page.getByRole('region', { name: 'Order workflow', exact: true })
    await expect(panel.getByText('Paid', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Cancel order', exact: true }).click()
    await panel.getByRole('button', { name: 'Keep order', exact: true }).click()
    await expect(panel.getByText('Open', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Cancel order', exact: true }).click()
    await panel.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
    await expect(panel.getByText('Cancelled', { exact: true })).toBeVisible()
    await expect(panel.getByText('Paid', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    expect(
      (await (await page.request.get(`/api/products/${product.id}?depth=0`)).json()).inventory,
    ).toBe(10)
    expect(
      (await (await page.request.get(`/api/transactions/${transaction.id}?depth=0`)).json()).status,
    ).toBe('succeeded')
  } finally {
    for (const fixture of fixtures.reverse()) {
      expect(
        (await page.request.delete(`/api/${fixture.collection}/${fixture.id}`)).ok(),
      ).toBeTruthy()
    }
  }
})
