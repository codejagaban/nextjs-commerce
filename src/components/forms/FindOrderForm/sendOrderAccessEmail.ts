'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { DEFAULT_STORE_NAME } from '@/brand'
import { renderActionEmail } from '@/email/template'
import { getServerSideURL } from '@/utilities/getURL'

type SendOrderAccessEmailArgs = {
  email: string
  orderID: string
}

type SendOrderAccessEmailResult = {
  success: boolean
  error?: string
}

export async function sendOrderAccessEmail({
  email,
  orderID,
}: SendOrderAccessEmailArgs): Promise<SendOrderAccessEmailResult> {
  const payload = await getPayload({ config: configPromise })

  try {
    const { docs: orders } = await payload.find({
      collection: 'orders',
      where: {
        and: [{ id: { equals: orderID } }, { customerEmail: { equals: email } }],
      },
      limit: 1,
      depth: 0,
    })

    const order = orders[0]

    if (!order || !order.accessToken) {
      return { success: true }
    }

    const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })
    const storeName = settings.storeName || DEFAULT_STORE_NAME
    const orderURL = new URL(`/orders/${order.id}`, getServerSideURL())
    orderURL.searchParams.set('email', email)
    orderURL.searchParams.set('accessToken', order.accessToken)
    const message = renderActionEmail({
      actionLabel: `View order #${order.id}`,
      intro: 'Use this secure link to view your order details.',
      note: 'Only share this link with someone you trust. It gives access to this order.',
      storeName,
      title: 'Your order link',
      url: orderURL.toString(),
    })

    await payload.sendEmail({
      to: email,
      subject: `Access your order #${order.id}`,
      html: message.html,
      text: message.text,
    })

    return { success: true }
  } catch (err) {
    payload.logger.error({ msg: 'Failed to send order access email', err })
    return { success: true }
  }
}
