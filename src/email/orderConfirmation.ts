import type { Order, Product, Setting, User, Variant } from '@/payload-types'
import { DEFAULT_STORE_NAME } from '@/brand'
import { getServerSideURL } from '@/utilities/getURL'
import type { Payload } from 'payload'

import { emailBodyFontFamily, emailFontStyles, escapeHTML } from './template'

const relationshipID = (value: null | number | string | { id: number | string } | undefined) =>
  typeof value === 'object' && value ? value.id : value

const itemName = (item: NonNullable<Order['items']>[number]) => {
  const product = typeof item.product === 'object' ? (item.product as Product) : undefined
  const variant = typeof item.variant === 'object' ? (item.variant as Variant) : undefined
  return variant?.title
    ? `${product?.title || 'Product'} - ${variant.title}`
    : product?.title || 'Product'
}

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).format(amount / 100)

const orderURL = (order: Order, recipient: string) => {
  const url = new URL(`/orders/${order.id}`, getServerSideURL())
  if (order.customerEmail && order.accessToken) {
    url.searchParams.set('email', recipient)
    url.searchParams.set('accessToken', order.accessToken)
  }
  return url.toString()
}

const addressLines = (order: Order) => {
  const address = order.shippingAddress
  if (!address) return []
  return [
    [address.title, address.firstName, address.lastName].filter(Boolean).join(' '),
    address.company,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ].filter((line): line is string => Boolean(line))
}

const recipientFor = async (payload: Payload, order: Order) => {
  if (order.customerEmail) return order.customerEmail
  if (typeof order.customer === 'object' && order.customer?.email) return order.customer.email

  const customerID = relationshipID(order.customer)
  if (!customerID) return null
  const customer = (await payload.findByID({
    collection: 'users',
    id: customerID,
    depth: 0,
    overrideAccess: true,
  })) as User
  return customer.email || null
}

export const renderOrderConfirmationEmail = ({
  order,
  recipient,
  settings,
}: {
  order: Order
  recipient: string
  settings: Setting
}) => {
  const storeName = settings.storeName || DEFAULT_STORE_NAME
  const currency = order.currency || settings.currency
  const total = formatMoney(order.amount || 0, currency)
  const url = orderURL(order, recipient)
  const items = order.items || []
  const address = addressLines(order)
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td class="email-ink email-rule" style="padding:14px 0;border-bottom:1px solid #ded8d3;color:#28211e;font-size:15px;line-height:1.45;">
            ${escapeHTML(itemName(item))}
          </td>
          <td class="email-muted email-rule" align="right" style="padding:14px 0;border-bottom:1px solid #ded8d3;color:#6d625d;font-size:14px;line-height:1.45;white-space:nowrap;">
            Qty ${escapeHTML(item.quantity)}
          </td>
        </tr>`,
    )
    .join('')
  const addressHTML = address.length
    ? `<p class="email-muted" style="margin:8px 0 0;color:#6d625d;font-size:14px;line-height:1.6;">${address.map(escapeHTML).join('<br>')}</p>`
    : ''

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Order ${escapeHTML(order.id)} confirmed</title>
    <style>
${emailFontStyles}
      @media (prefers-color-scheme: dark) {
        .email-body { background:#201b19 !important; }
        .email-panel { background:#2b2522 !important; }
        .email-ink { color:#f5efea !important; }
        .email-muted { color:#c6bab3 !important; }
        .email-rule { border-color:#4b403b !important; }
        .email-button { background:#f5efea !important; color:#28211e !important; }
      }
    </style>
  </head>
  <body class="email-body" style="margin:0;background:#f5f0ec;padding:32px 16px;color:#28211e;font-family:${emailBodyFontFamily};">
    <div class="email-panel" style="width:100%;max-width:620px;margin:0 auto;background:#fffaf6;padding:36px;box-sizing:border-box;">
      <p class="email-muted" style="margin:0 0 28px;color:#6d625d;font-size:13px;letter-spacing:.04em;">${escapeHTML(storeName)}</p>
      <h1 class="email-ink" style="margin:0;color:#28211e;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;line-height:1.15;">Your order is confirmed</h1>
      <p class="email-muted" style="margin:14px 0 28px;color:#6d625d;font-size:15px;line-height:1.6;">Thanks for your order. Payment has been received and we are preparing it now.</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td class="email-muted email-rule" style="padding:0 0 14px;border-bottom:1px solid #ded8d3;color:#6d625d;font-size:13px;">Order #${escapeHTML(order.id)}</td>
          <td class="email-ink email-rule" align="right" style="padding:0 0 14px;border-bottom:1px solid #ded8d3;color:#28211e;font-size:17px;font-weight:700;">${escapeHTML(total)}</td>
        </tr>
        ${itemRows}
      </table>

      ${addressHTML ? `<div style="margin-top:28px;"><p class="email-ink" style="margin:0;color:#28211e;font-size:14px;font-weight:700;">Shipping to</p>${addressHTML}</div>` : ''}

      <p style="margin:32px 0 0;">
        <a class="email-button" href="${escapeHTML(url)}" style="display:inline-block;background:#28211e;color:#fffaf6;padding:13px 20px;text-decoration:none;font-size:14px;font-weight:700;">View order</a>
      </p>
      <p class="email-muted" style="margin:28px 0 0;color:#7d716b;font-size:12px;line-height:1.6;">If you did not place this order, contact ${escapeHTML(settings.supportEmail || 'the store team')}.</p>
    </div>
  </body>
</html>`

  const text = [
    `${storeName} - order #${order.id} confirmed`,
    '',
    'Payment has been received and we are preparing your order.',
    '',
    ...items.map((item) => `${itemName(item)} x ${item.quantity}`),
    '',
    `Total: ${total}`,
    ...(address.length ? ['', 'Shipping to:', ...address] : []),
    '',
    `View order: ${url}`,
  ].join('\n')

  return {
    html,
    subject: `Order #${order.id} confirmed`,
    text,
    to: recipient,
  }
}

/** Claims and delivers one receipt. Repeated browser/webhook confirmations are no-ops. */
export const sendOrderConfirmationEmail = async (payload: Payload, orderID: number | string) => {
  const order = (await payload.findByID({
    collection: 'orders',
    id: orderID,
    depth: 2,
    overrideAccess: true,
  })) as Order
  const recipient = await recipientFor(payload, order)
  if (!recipient) {
    payload.logger.warn({ msg: 'Order confirmation email has no recipient.', orderID })
    return false
  }

  const claimed = await payload.db.updateOne({
    collection: 'orders',
    data: { confirmationEmailSentAt: new Date().toISOString() },
    options: { atomic: true },
    where: {
      and: [{ id: { equals: orderID } }, { confirmationEmailSentAt: { exists: false } }],
    },
  })
  if (!claimed) return false

  try {
    const settings = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as Setting
    await payload.sendEmail(renderOrderConfirmationEmail({ order, recipient, settings }))
    return true
  } catch (error) {
    await payload.db.updateOne({
      collection: 'orders',
      data: { confirmationEmailSentAt: null },
      where: { id: { equals: orderID } },
    })
    throw error
  }
}
