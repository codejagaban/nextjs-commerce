import type { Payload, PayloadHandler } from 'payload'
import type { Order, Setting, ShipmentNotification } from '@/payload-types'
import { isAdmin } from '@/access/isAdmin'
import { DEFAULT_STORE_NAME } from '@/brand'
import { orderURL, recipientFor } from './orderConfirmation'
import { emailBodyFontFamily, escapeHTML } from './template'
import { safeTrackingURL } from '@/orders/fulfillment'

export const renderShipmentEmail = (
  order: Order,
  shipment: NonNullable<Order['shipments']>[number],
  kind: ShipmentNotification['kind'],
  recipient: string,
  settings: Setting,
) => {
  const title =
    kind === 'delivered'
      ? 'Your shipment was marked delivered'
      : kind === 'tracking'
        ? 'Your tracking details have been updated'
        : 'Your shipment is on its way'
  const lines = shipment.items.map((row) => {
    const item = order.items?.find((item) => item.id === row.orderItemID)
    const product = typeof item?.product === 'object' ? item.product : null
    const variant = typeof item?.variant === 'object' ? item.variant : null
    return `${product?.title ?? 'Ordered item'}${variant?.title ? ` - ${variant.title}` : ''} × ${row.quantity}`
  })
  const tracking = safeTrackingURL(shipment.trackingURL ?? '')
  const link = orderURL(order, recipient)
  const text = [
    settings.storeName || DEFAULT_STORE_NAME,
    title,
    `Order #${order.id}`,
    ...lines,
    `Carrier: ${shipment.carrier}`,
    ...(shipment.trackingNumber ? [`Tracking: ${shipment.trackingNumber}`] : []),
    ...(tracking ? [`Track shipment: ${tracking}`] : []),
    `View order: ${link}`,
  ].join('\n\n')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#f5f0ec;color:#28211e;font-family:${emailBodyFontFamily}"><main style="max-width:620px;margin:auto;padding:28px;background:#fffaf6"><p>${escapeHTML(settings.storeName || DEFAULT_STORE_NAME)}</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px">${escapeHTML(title)}</h1><p>Order #${order.id}</p><ul>${lines.map((line) => `<li style="margin:12px 0">${escapeHTML(line)}</li>`).join('')}</ul><p>Carrier: ${escapeHTML(shipment.carrier)}</p>${shipment.trackingNumber ? `<p>Tracking: ${escapeHTML(shipment.trackingNumber)}</p>` : ''}${tracking ? `<p><a style="color:#28211e" href="${escapeHTML(tracking)}">Track shipment</a></p>` : ''}<p><a style="color:#28211e" href="${escapeHTML(link)}">View order</a></p></main></body></html>`
  return {
    to: recipient,
    subject: `Order #${order.id}: ${kind === 'delivered' ? 'shipment delivered' : kind === 'tracking' ? 'tracking updated' : 'shipment dispatched'}`,
    text,
    html,
  }
}

export async function sendShipmentNotification(payload: Payload, id: number): Promise<string> {
  const claimed = await payload.db.updateOne({
    collection: 'shipment-notifications',
    options: { atomic: true },
    where: { and: [{ id: { equals: id } }, { status: { in: ['pending', 'failed'] } }] },
    data: { status: 'sending' },
  })
  if (!claimed) return 'unchanged'
  try {
    const entry = await payload.findByID({ collection: 'shipment-notifications', id, depth: 0 })
    const orderID = typeof entry.order === 'object' ? entry.order.id : entry.order
    const order = await payload.findByID({ collection: 'orders', id: orderID, depth: 2 })
    const shipment = order.shipments?.find((shipment) => shipment.id === entry.shipmentID)
    const recipient = await recipientFor(payload, order)
    if (!shipment || !recipient)
      throw new Error('Shipment notification is missing its shipment or recipient.')
    const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })
    await payload.sendEmail(renderShipmentEmail(order, shipment, entry.kind, recipient, settings))
  } catch (error) {
    await payload.db.updateOne({
      collection: 'shipment-notifications',
      id,
      data: { status: 'failed' },
    })
    payload.logger.error({
      err: error,
      msg: 'Shipment saved, but its notification failed.',
      notificationID: id,
    })
    return 'failed'
  }
  // If persistence fails after SMTP accepted the message, leave 'sending'. Never
  // automatically resend an ambiguous delivery and claim exactly-once email.
  await payload.db.updateOne({
    collection: 'shipment-notifications',
    id,
    data: { status: 'sent', sentAt: new Date().toISOString() },
  })
  return 'sent'
}

export const retryShipmentNotification: PayloadHandler = async (req) => {
  if (!(await isAdmin({ req })))
    return Response.json({ message: 'Administrator access is required.' }, { status: 403 })
  const id = Number(req.routeParams?.notificationID)
  const orderID = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || !Number.isSafeInteger(orderID))
    return Response.json({ message: 'Invalid notification.' }, { status: 400 })
  const notification = await req.payload.findByID({
    collection: 'shipment-notifications',
    id,
    depth: 0,
    disableErrors: true,
  })
  if (!notification || notification.order !== orderID)
    return Response.json({ message: 'Notification not found.' }, { status: 404 })
  try {
    return Response.json({ status: await sendShipmentNotification(req.payload, id) })
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: 'Notification delivery needs reconciliation.',
      notificationID: id,
    })
    return Response.json(
      { message: 'Delivery could not be confirmed. Check the email provider before resending.' },
      { status: 503 },
    )
  }
}
