import { randomUUID } from 'node:crypto'
import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test'
import sharp from 'sharp'
import Stripe from 'stripe'
import { smokeConfig, resetLink } from './config'
import { messagesFor, type Message } from './mailbox'
import { cleanupRecords, listRecords, type Document } from './records'

const config = smokeConfig()
const stripe = new Stripe(config.stripeKey, { timeout: 15_000, maxNetworkRetries: 1 })
type Run = {
  email: string
  slug: string
  mediaName: string
  password: string
  admin: APIRequestContext
}

// Fixture teardown has its own timeout, including after a timed-out test.
const test = base.extend<{ run: Run }>({
  run: [
    async ({ playwright }, useFixture, testInfo) => {
      const id = randomUUID()
      const [name, domain] = config.mailbox.split('@')
      const run = {
        email: `${name.split('+')[0]}+smoke-${id}@${domain}`,
        slug: `commerce-smoke-${id}`,
        mediaName: `commerce-smoke-${id}.png`,
        password: `Smoke-${id}-Aa1!`,
        admin: await playwright.request.newContext({
          baseURL: config.baseURL,
          extraHTTPHeaders: { Origin: config.baseURL },
          timeout: 15_000,
        }),
      }
      let authenticated = false
      const failures: string[] = []
      try {
        const login = await run.admin.post('/api/users/login', {
          data: { email: config.adminEmail, password: config.adminPassword },
        })
        expect(login.ok(), 'Smoke admin login failed.').toBeTruthy()
        authenticated = true
        await useFixture(run)
      } finally {
        // Cancel unpaid attempts; successful Stripe test payments remain as sandbox evidence.
        // Do not refund: a refund could dispatch a new event during record cleanup.
        try {
          for await (const customer of stripe.customers.list({ email: run.email, limit: 100 })) {
            if (customer.email !== run.email || customer.livemode)
              throw new Error('Unexpected Stripe customer.')
            for await (const intent of stripe.paymentIntents.list({
              customer: customer.id,
              limit: 100,
            })) {
              if (
                ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(
                  intent.status,
                )
              ) {
                await stripe.paymentIntents.cancel(intent.id)
              } else if (intent.status === 'succeeded') {
                // A browser failure can happen while the webhook is still writing.
                // Keep the fixture if that write never settles; deletion would race it.
                await expect
                  .poll(
                    async () => {
                      const transactions = await listRecords(
                        run.admin,
                        'transactions',
                        'stripe.paymentIntentID',
                        intent.id,
                      )
                      return (
                        transactions.length === 1 &&
                        transactions[0].status === 'succeeded' &&
                        Boolean(transactions[0].order)
                      )
                    },
                    {
                      timeout: 30_000,
                      message: 'Paid smoke transaction has not settled; retaining fixtures.',
                    },
                  )
                  .toBe(true)
              } else if (!['succeeded', 'canceled'].includes(intent.status)) {
                throw new Error('Payment is still processing; retaining fixtures for recovery.')
              }
            }
            await stripe.customers.del(customer.id)
          }
        } catch {
          failures.push('Stripe sandbox cleanup failed; retaining application fixtures.')
        }
        if (authenticated && !failures.length) {
          try {
            await cleanupRecords(run.admin, run)
          } catch (error) {
            failures.push(error instanceof Error ? error.message : 'Record cleanup failed.')
          }
        }
        await run.admin.dispose()
        // No passwords, tokens, email contents, or Stripe client secrets in artifacts.
        await testInfo.attach('smoke-run', {
          body: JSON.stringify({ run: run.slug, cleanup: failures.length ? failures : 'complete' }),
          contentType: 'application/json',
        })
        expect(
          failures,
          'Smoke-test cleanup requires attention. See the smoke-run artifact.',
        ).toEqual([])
      }
    },
    { timeout: 90_000 },
  ],
})

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL(/\/account/)
}

async function logout(page: Page) {
  await page.goto('/logout')
  await expect(page.getByRole('heading', { name: 'Logged out successfully.' })).toBeVisible()
  expect(
    (
      await (
        await page.request.get('/api/users/me', { headers: { Origin: config.baseURL } })
      ).json()
    ).user,
  ).toBeNull()
}

async function readDocument(api: APIRequestContext, collection: string, id: number) {
  const response = await api.get(`/api/${collection}/${id}?depth=0`)
  expect(response.ok(), `Could not read ${collection}/${id}.`).toBeTruthy()
  return response.json()
}

async function waitForEmail(email: string, subject: RegExp) {
  let messages: Message[] = []
  await expect
    .poll(
      async () => {
        messages = (await messagesFor(config.inbox, email)).filter((message) =>
          subject.test(message.subject),
        )
        return messages.length
      },
      {
        timeout: 60_000,
        intervals: [1000, 2000, 5000],
        message: 'Expected email did not reach the test inbox.',
      },
    )
    .toBe(1)
  return messages[0]
}

test('customer purchase, webhook, receipt, password reset and media delivery', async ({
  page,
  run,
  playwright,
}) => {
  const { admin } = run
  const apiHeaders = { Origin: config.baseURL }
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (url.hostname.endsWith('stripe.com') || url.hostname.endsWith('stripe.network')) {
      console.info(
        `Stripe request failed: ${url.origin}${url.pathname} (${request.failure()?.errorText})`,
      )
    }
  })
  let product: Document
  let customerID: number
  let order: Document
  let intentID: string
  let cartID: number
  let currency: string

  await test.step('Upload a temporary image and verify original, derivative and optimizer', async () => {
    // A generated fixture avoids depending on existing merchant images or their formats.
    const image = await sharp({
      create: { width: 900, height: 700, channels: 3, background: '#43614f' },
    })
      .png()
      .toBuffer()
    const upload = await admin.post('/api/media', {
      multipart: {
        _payload: JSON.stringify({ alt: run.slug }),
        file: { name: run.mediaName, mimeType: 'image/png', buffer: image },
      },
    })
    expect(upload.ok(), 'Temporary media upload failed.').toBeTruthy()
    const media = (await upload.json()).doc
    expect(new URL(media.url, config.baseURL).origin).toBe(config.mediaOrigin)
    const asset = await admin.get(new URL(media.url, config.baseURL).href)
    expect(asset.ok(), 'Original image delivery failed.').toBeTruthy()
    expect((await sharp(await asset.body()).metadata()).width).toBe(900)
    const derivative = await admin.get(new URL(media.sizes.thumbnail.url, config.baseURL).href)
    expect(derivative.ok(), 'Generated thumbnail delivery failed.').toBeTruthy()
    expect((await sharp(await derivative.body()).metadata()).width).toBe(400)
    const optimized = await admin.get(
      `/_next/image?url=${encodeURIComponent(media.url)}&w=640&q=75`,
    )
    expect(optimized.ok(), 'Next.js image optimization failed.').toBeTruthy()
    expect((await sharp(await optimized.body()).metadata()).width).toBe(640)

    const settings = await admin.get('/api/globals/settings?depth=0')
    expect(settings.ok()).toBeTruthy()
    currency = (await settings.json()).currency
    expect(['USD', 'GBP', 'EUR']).toContain(currency)
    const result = await admin.post('/api/products', {
      data: {
        _status: 'published',
        inventory: 3,
        slug: run.slug,
        title: run.slug,
        [`priceIn${currency}`]: 100,
        [`priceIn${currency}Enabled`]: true,
        gallery: [{ image: media.id }],
      },
    })
    expect(result.ok(), 'Temporary product creation failed.').toBeTruthy()
    product = (await result.json()).doc
  })

  await test.step('Sign up, log out, log in and save a customer address', async () => {
    await page.goto('/create-account')
    await page.getByLabel('Email', { exact: true }).fill(run.email)
    await page.getByLabel('Password', { exact: true }).fill(run.password)
    await page.getByLabel('Confirm password', { exact: true }).fill(run.password)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page).toHaveURL(/\/account/)
    const currentUser = (
      await (await page.request.get('/api/users/me', { headers: apiHeaders })).json()
    ).user
    expect(currentUser?.email, 'Signup must create an authenticated customer session.').toBe(
      run.email,
    )
    customerID = currentUser.id
    await logout(page)
    await login(page, run.email, run.password)
    await page.goto('/account/addresses')
    await page.getByRole('button', { name: 'Add a new address' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('First name').fill('Commerce')
    await dialog.getByLabel('Last name').fill('Smoke')
    await dialog.getByLabel('Address line 1').fill('1 Test Street')
    await dialog.getByLabel('City').fill('London')
    await dialog.getByLabel('Zip Code').fill('SW1A 1AA')
    await dialog.getByLabel('Country').click()
    await page.getByRole('option', { name: 'United Kingdom', exact: true }).click()
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('1 Test Street')).toBeVisible()
  })

  await test.step('Enter a Stripe test card and let the webhook settle before browser confirmation', async () => {
    await page.goto(`/products/${run.slug}`)
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Open cart, 1 items', includeHidden: true }),
    ).toHaveCount(1)
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Open cart, 1 items', includeHidden: true }),
    ).toHaveCount(1)
    await page.goto('/checkout')
    await expect(page.getByText('1 Test Street')).toBeVisible()
    const initiation = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/api/payments/stripe/initiate'),
    )
    await page.getByRole('button', { name: 'Go to payment', exact: true }).click()
    const response = await initiation
    expect(response.ok(), 'Payment initiation failed.').toBeTruthy()
    intentID = (await response.json()).paymentIntentID
    const intent = await stripe.paymentIntents.retrieve(intentID)
    // This also proves the deployment and test runner use the same Stripe sandbox.
    expect(intent.livemode, 'Refusing to submit a live payment.').toBe(false)
    expect(intent.amount).toBe(100)
    expect(intent.currency).toBe(currency.toLowerCase())
    cartID = Number(intent.metadata.cartID)
    expect(Number.isSafeInteger(cartID)).toBe(true)

    await expect(
      page.getByRole('button', { name: 'Pay now', exact: true }),
      'Stripe Payment Element did not become ready.',
    ).toBeEnabled({ timeout: 30_000 })
    const frame = page.frameLocator(
      'iframe[title="Secure payment input frame"]:not([aria-hidden="true"])',
    )
    const cardTab = frame.getByRole('tab', { name: /^Card/ })
    if (await cardTab.count()) await cardTab.click()
    // Stripe's masked fields auto-advance focus and validate asynchronously.
    // Type as a customer would instead of replacing all characters at once.
    await frame
      .getByLabel('Card number', { exact: true })
      .pressSequentially('4242424242424242', { delay: 35 })
    await frame
      .getByLabel('Expiration date', { exact: true })
      .pressSequentially('12' + String(new Date().getFullYear() + 3).slice(-2), { delay: 35 })
    await frame.getByLabel('Security code', { exact: true }).pressSequentially('123', { delay: 35 })
    const country = frame.getByLabel('Country', { exact: true })
    if (await country.count()) await country.selectOption('GB')
    const postal = frame.getByLabel(/Postal code|ZIP code/)
    if (await postal.count()) {
      await postal.fill('SW1A 1AA')
      await postal.blur()
    }
    await expect(frame.getByLabel('Card number', { exact: true })).toHaveValue(
      '4242 4242 4242 4242',
    )
    await expect(frame.getByLabel('Security code', { exact: true })).toHaveValue('123')

    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const confirmationRoute = '**/api/payments/stripe/confirm-order'
    await page.route(confirmationRoute, async (route) => {
      await gate
      await route.continue()
    })
    try {
      const payButton = page.getByRole('button', { name: 'Pay now', exact: true })
      // Leave the embedded form before clicking; Stripe auto-advances focus and scrolls.
      await payButton.focus()
      await expect(payButton).toBeFocused()
      await payButton.click()
      await expect
        .poll(async () => (await stripe.paymentIntents.retrieve(intentID)).status, {
          message: 'Browser card payment did not succeed.',
          timeout: 45_000,
        })
        .toBe('succeeded')
      await expect
        .poll(
          async () => {
            const orders = await listRecords(admin, 'orders', 'customer', customerID)
            if (orders.length > 1) throw new Error('Duplicate order created by settlement.')
            order = orders[0]
            return order?.confirmationEmailSentAt ? orders.length : 0
          },
          {
            message: 'Stripe webhook did not create the order and send its receipt.',
            timeout: 60_000,
          },
        )
        .toBe(1)
      expect(order!.amount).toBe(100)
      expect(order!.currency).toBe(currency)
      expect(order!.subtotal).toBe(100)
      expect(order!.customer).toBe(customerID)
      expect(order!.shippingAddress).toMatchObject({ addressLine1: '1 Test Street', country: 'GB' })
      expect((await readDocument(admin, 'products', product.id)).inventory).toBe(2)
      const cart = await readDocument(admin, 'carts', cartID)
      expect(cart.purchasedAt).toBeTruthy()
      expect(cart.items).toHaveLength(0)
      const transactions = await listRecords(
        admin,
        'transactions',
        'stripe.paymentIntentID',
        intentID,
      )
      expect(transactions).toHaveLength(1)
      expect(transactions[0]).toMatchObject({ status: 'succeeded', order: order!.id })
    } finally {
      release()
      await page.unrouteAll({ behavior: 'wait' })
    }
    await expect(page).toHaveURL(new RegExp(`/orders/${order!.id}(?:\\?|$)`))
    await expect(page.getByRole('main').getByText(run.slug, { exact: true })).toBeVisible()
  })

  await test.step('Verify confirmation retries, receipt content and private order access', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        page.request.post('/api/payments/stripe/confirm-order', {
          headers: apiHeaders,
          data: { paymentIntentID: intentID, cartID },
        }),
      ),
    )
    for (const response of responses) {
      expect(response.ok()).toBeTruthy()
      expect((await response.json()).orderID).toBe(order.id)
    }
    expect(await listRecords(admin, 'orders', 'customer', customerID)).toHaveLength(1)
    expect((await readDocument(admin, 'products', product.id)).inventory).toBe(2)
    const receipt = await waitForEmail(run.email, new RegExp(`Order #${order.id} confirmed`))
    expect(receipt.html.includes(run.slug)).toBe(true)
    expect(receipt.html.includes(`${config.baseURL}/orders/${order.id}`)).toBe(true)
    const anonymous = await playwright.request.newContext({ baseURL: config.baseURL })
    try {
      expect([403, 404]).toContain((await anonymous.get(`/api/orders/${order.id}`)).status())
    } finally {
      await anonymous.dispose()
    }
  })

  await test.step('Open the emailed reset link, change password, and reject the old password and reused token', async () => {
    await logout(page)
    await page.goto('/forgot-password')
    await page.getByLabel('Email', { exact: true }).fill(run.email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/Check your email for a link/)).toBeVisible()
    const email = await waitForEmail(run.email, /^Reset your .+ password$/)
    const url = resetLink(email.html, config.baseURL)
    const newPassword = `Reset-${randomUUID()}-Bb2!`
    await page.goto(url.href)
    await page.getByLabel('New password', { exact: true }).fill(newPassword)
    await page.getByLabel('Confirm new password', { exact: true }).fill(newPassword)
    await page.getByRole('button', { name: 'Set new password', exact: true }).click()
    await expect(page).toHaveURL(/\/account\?reset=1/)
    await logout(page)
    const rejected = await page.request.post('/api/users/login', {
      headers: apiHeaders,
      data: { email: run.email, password: run.password },
    })
    expect([400, 401]).toContain(rejected.status())
    const reused = await page.request.post('/api/users/reset-password', {
      headers: apiHeaders,
      data: { token: url.searchParams.get('token'), password: 'ShouldNotWork123!' },
    })
    expect(reused.status()).toBe(403)
    expect((await reused.json()).errors).toEqual([
      { message: 'Token is either invalid or has expired.' },
    ])
    await login(page, run.email, newPassword)
    await page.goto(`/orders/${order.id}`)
    await expect(page.getByRole('main').getByText(run.slug, { exact: true })).toBeVisible()
    // Receipt remains single even after concurrent confirmation retries and account recovery.
    expect(
      (await messagesFor(config.inbox, run.email)).filter(
        (m) => m.subject === `Order #${order.id} confirmed`,
      ),
    ).toHaveLength(1)
  })
})
