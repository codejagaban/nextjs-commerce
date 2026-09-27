import { expect, test, type APIRequestContext } from '@playwright/test'
import Stripe from 'stripe'

type Document = { id: number; [key: string]: unknown }
type ListResponse = { docs?: Document[] }

const baseURL = new URL(process.env.SMOKE_BASE_URL!).origin
const adminEmail = process.env.SMOKE_ADMIN_EMAIL!
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD!
const customerMailbox = process.env.SMOKE_CUSTOMER_EMAIL!
const stripe = new Stripe(process.env.SMOKE_STRIPE_SECRET_KEY!)

const runID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const [mailboxName, mailboxDomain] = customerMailbox.split('@')
const customerEmail = `${mailboxName.split('+')[0]}+commerce-smoke-${runID}@${mailboxDomain}`
const customerPassword = `Smoke-${runID}-Aa1!`
const productSlug = `commerce-smoke-${runID}`

async function loginAsAdmin(request: APIRequestContext) {
  const response = await request.post('/api/users/login', {
    data: { email: adminEmail, password: adminPassword },
  })
  expect(response.ok(), 'The smoke-test admin account could not log in.').toBeTruthy()
}

async function list(
  request: APIRequestContext,
  collection: string,
  field: string,
  value: string | number,
) {
  const params = new URLSearchParams({
    depth: '0',
    limit: '100',
    [`where[${field}][equals]`]: String(value),
  })
  const response = await request.get(`/api/${collection}?${params}`)
  if (!response.ok()) return []
  return ((await response.json()) as ListResponse).docs ?? []
}

async function remove(
  request: APIRequestContext,
  collection: string,
  id: number,
  errors: string[],
) {
  const response = await request.delete(`/api/${collection}/${id}`)
  if (!response.ok()) errors.push(`${collection} record ${id} returned ${response.status()}`)
}

test('hosted commerce flow settles safely and cleans up its synthetic records', async ({
  page,
  playwright,
}) => {
  const admin = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  })

  let productID: number | undefined
  let customerID: number | undefined
  const cleanupErrors: string[] = []

  try {
    await loginAsAdmin(admin)

    const productResponse = await admin.post('/api/products', {
      data: {
        _status: 'published',
        inventory: 3,
        priceInUSD: 100,
        priceInUSDEnabled: true,
        slug: productSlug,
        title: `Commerce smoke ${runID}`,
      },
    })
    expect(
      productResponse.ok(),
      'The temporary smoke-test product could not be created.',
    ).toBeTruthy()
    productID = ((await productResponse.json()) as { doc: Document }).doc.id

    await page.goto('/create-account')
    await page.getByLabel('Email', { exact: true }).fill(customerEmail)
    await page.getByLabel('Password', { exact: true }).fill(customerPassword)
    await page.getByLabel('Confirm password', { exact: true }).fill(customerPassword)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page).toHaveURL(/\/account/)

    const meResponse = await page.request.get('/api/users/me')
    expect(meResponse.ok()).toBeTruthy()
    customerID = ((await meResponse.json()) as { user: Document }).user.id

    await page.goto('/account/addresses')
    await page.getByRole('button', { name: 'Add a new address' }).click()
    await page.getByLabel('First name').fill('Commerce')
    await page.getByLabel('Last name').fill('Smoke')
    await page.getByLabel('Address line 1').fill('1 Test Street')
    await page.getByLabel('City').fill('London')
    await page.getByLabel('Zip Code').fill('SW1A 1AA')
    await page.getByLabel('Country').click()
    await page.getByRole('option', { name: 'United Kingdom' }).click()
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByText('1 Test Street')).toBeVisible()

    await page.goto(`/products/${productSlug}`)
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await expect(page.getByRole('button', { name: /Open cart, 1 items/ })).toBeVisible()

    await page.goto('/checkout')
    await page.getByRole('button', { name: 'Select an address' }).click()
    await page.getByRole('button', { name: 'Select', exact: true }).click()

    const initiation = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/payments/stripe/initiate'),
    )
    await page.getByRole('button', { name: 'Go to payment' }).click()
    const initiationResponse = await initiation
    expect(initiationResponse.ok(), 'Stripe payment initiation failed.').toBeTruthy()
    const payment = (await initiationResponse.json()) as { paymentIntentID?: string }
    expect(payment.paymentIntentID).toBeTruthy()

    const intent = await stripe.paymentIntents.confirm(payment.paymentIntentID!, {
      payment_method: 'pm_card_visa',
      return_url: `${baseURL}/checkout/confirm-order`,
    })
    expect(intent.status).toBe('succeeded')

    let order: Document | undefined
    await expect
      .poll(
        async () => {
          const orders = await list(admin, 'orders', 'customer', customerID!)
          order = orders[0]
          return order?.confirmationEmailSentAt
        },
        {
          message: 'The webhook did not settle the order and complete its confirmation email.',
          timeout: 45_000,
        },
      )
      .toBeTruthy()

    await page.goto(`/orders/${order!.id}`)
    await expect(page.getByText(`Order #${order!.id}`)).toBeVisible()
    await expect(page.getByText('Commerce smoke', { exact: false })).toBeVisible()

    await page.goto('/forgot-password')
    await page.getByLabel('Email', { exact: true }).fill(customerEmail)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/Check your email for a link/)).toBeVisible()

    const mediaResponse = await admin.get('/api/media?depth=0&limit=1')
    expect(mediaResponse.ok()).toBeTruthy()
    const media = ((await mediaResponse.json()) as ListResponse).docs?.[0]
    expect(media, 'The deployed store needs at least one media record.').toBeTruthy()
    expect(typeof media!.url === 'string' && media!.url.length > 0).toBeTruthy()
    const mediaURL = media!.url as string
    const original = await admin.get(mediaURL)
    expect(original.ok(), 'The original media asset could not be delivered.').toBeTruthy()
    const optimized = await admin.get(`/_next/image?url=${encodeURIComponent(mediaURL)}&w=640&q=75`)
    expect(optimized.ok(), 'The deployed image optimizer could not transform media.').toBeTruthy()
    expect(optimized.headers()['content-type']).toMatch(/^image\//)
  } finally {
    if (!customerID) {
      customerID = (await list(admin, 'users', 'email', customerEmail))[0]?.id
    }
    if (!productID) {
      productID = (await list(admin, 'products', 'slug', productSlug))[0]?.id
    }

    if (customerID) {
      const carts = await list(admin, 'carts', 'customer', customerID)
      const orders = await list(admin, 'orders', 'customer', customerID)
      const transactionIDs = new Set<number>()

      for (const order of orders) {
        for (const transaction of (order.transactions as
          Array<number | { id: number }> | undefined) ?? []) {
          transactionIDs.add(typeof transaction === 'number' ? transaction : transaction.id)
        }
        await remove(admin, 'orders', order.id, cleanupErrors)
      }
      for (const cart of carts) {
        for (const transaction of await list(admin, 'transactions', 'cart', cart.id)) {
          transactionIDs.add(transaction.id)
        }
      }
      for (const id of transactionIDs) {
        await remove(admin, 'transactions', id, cleanupErrors)
      }
      for (const cart of carts) await remove(admin, 'carts', cart.id, cleanupErrors)
      for (const address of await list(admin, 'addresses', 'customer', customerID)) {
        await remove(admin, 'addresses', address.id, cleanupErrors)
      }
      await remove(admin, 'users', customerID, cleanupErrors)
    }
    if (productID) await remove(admin, 'products', productID, cleanupErrors)
    await admin.dispose()
    expect(cleanupErrors, 'Some synthetic smoke-test records could not be removed.').toEqual([])
  }
})
