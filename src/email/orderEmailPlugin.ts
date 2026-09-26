import type { Plugin } from 'payload'

import { sendOrderConfirmationEmail } from './orderConfirmation'

/** Sends receipts after the payment endpoint has committed its database transaction. */
export const orderEmailPlugin: Plugin = (config) => ({
  ...config,
  endpoints: config.endpoints?.map((endpoint) => {
    if (endpoint.method !== 'post' || !endpoint.path.endsWith('/confirm-order')) return endpoint

    const confirmOrder = endpoint.handler
    return {
      ...endpoint,
      handler: async (req) => {
        const response = await confirmOrder(req)
        if (!response?.ok) return response

        try {
          const result = (await response.clone().json()) as { orderID?: number | string }
          if (result.orderID !== undefined) {
            await sendOrderConfirmationEmail(req.payload, result.orderID)
          }
        } catch (error) {
          req.payload.logger.error({
            err: error,
            msg: 'Order was confirmed, but its confirmation email could not be sent.',
          })
        }

        return response
      },
    }
  }),
})
